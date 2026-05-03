// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Manages single escrow agreement: holds funds, validates milestones, enforces role-based access. Deployed per-project via factory.
contract EscrowProject is AccessControl, ReentrancyGuard {
    bytes32 public constant CLIENT_ROLE = keccak256("CLIENT");
    bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER");

    // Custom errors save gas vs require strings (~200 bytes per error)
    error Unauthorized();
    error InvalidMilestoneIndex();
    error InvalidMilestoneStatus();
    error InsufficientBalance();
    error TransferFailed();
    error DisputeActive();

    // Milestone status transitions: Pending → Submitted → Approved/Rejected → Released or Disputed
    enum MilestoneStatus {
        Pending,      
        Submitted,   
        Approved,     
        Rejected,     
        Disputed,     
        Released      
    }

    // Stores milestone data: packed efficiently in storage
    struct Milestone {
        string title;
        uint256 amount;
        MilestoneStatus status;
    }

    // Project participants and fund tracking
    address public client;              // Funds owner, approves milestones
    address public provider;            // Executes work, withdraws funds
    address public arbiter;             // Neutral third-party dispute resolver
    uint256 public totalAmount;         // Sum of all milestone amounts (immutable after deploy)
    uint256 public releasedAmount;      // Running total of withdrawn funds
    bool public disputeActive;          // Blocks withdrawals/approvals during disputes

    Milestone[] public milestones;      // Array of project tasks

    // Events indexed for efficient subgraph filtering
    event DepositReceived(uint256 amount);
    event MilestoneSubmitted(uint256 indexed index);
    event MilestoneApproved(uint256 indexed index);
    event RevisionRequested(uint256 indexed index);
    event MilestoneRetried(uint256 indexed index);
    event DisputeRaised(uint256 indexed index, address indexed raisedBy);
    event DisputeResolved(uint256 indexed index);
    event FundsWithdrawn(uint256 amount);

    // Initializes project: validates inputs, grants roles, stores milestones. Called by factory.
    constructor(
        address _client,
        address _provider,
        address _arbiter,
        string[] memory _titles,
        uint256[] memory _amounts
    ) {
        require(_client != address(0), "Invalid client");
        require(_provider != address(0), "Invalid provider");
        require(_arbiter != address(0), "Invalid arbiter");
        require(_titles.length == _amounts.length, "Array length mismatch");

        client = _client;
        provider = _provider;
        arbiter = _arbiter;

        // Grant roles: each address gets exactly one role to avoid permission overlap
        _grantRole(CLIENT_ROLE, _client);
        _grantRole(PROVIDER_ROLE, _provider);
        _grantRole(ARBITER_ROLE, _arbiter);
        _grantRole(DEFAULT_ADMIN_ROLE, _client);

        // Initialize milestones: compute totalAmount upfront for validation
        for (uint256 i = 0; i < _titles.length; i++) {
            milestones.push(Milestone(_titles[i], _amounts[i], MilestoneStatus.Pending));
            totalAmount += _amounts[i];
        }
    }

    // Receives ETH deposit: called when funds sent to contract. Validates deposit matches totalAmount.
    receive() external payable {
        require(msg.value == totalAmount, "Incorrect deposit amount");
        emit DepositReceived(msg.value);
    }

    // Returns all project details in single call to reduce RPC queries
    function getProjectDetails()
        external
        view
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            bool
        )
    {
        return (client, provider, arbiter, totalAmount, releasedAmount, disputeActive);
    }

    // Returns all milestones: frontend loops through this to display progress
    function getMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }

    // Returns milestone count: useful for pagination or loop bounds
    function getMilestonesCount() external view returns (uint256) {
        return milestones.length;
    }

    // Provider marks work complete: Pending → Submitted. Can't approve own work.
    function markMilestoneComplete(uint256 _milestoneIndex)
        external
        onlyRole(PROVIDER_ROLE)
    {
        if (_milestoneIndex >= milestones.length) revert InvalidMilestoneIndex();
        if (milestones[_milestoneIndex].status != MilestoneStatus.Pending) {
            revert InvalidMilestoneStatus();
        }

        milestones[_milestoneIndex].status = MilestoneStatus.Submitted;
        emit MilestoneSubmitted(_milestoneIndex);
    }

    // Client approves completed work: Submitted → Approved. Unlocks funds for withdrawal. Blocked during disputes.
    function approveMilestone(uint256 _milestoneIndex)
        external
        onlyRole(CLIENT_ROLE)
    {
        if (disputeActive) revert DisputeActive();
        if (_milestoneIndex >= milestones.length) revert InvalidMilestoneIndex();
        if (milestones[_milestoneIndex].status != MilestoneStatus.Submitted) {
            revert InvalidMilestoneStatus();
        }

        milestones[_milestoneIndex].status = MilestoneStatus.Approved;
        emit MilestoneApproved(_milestoneIndex);
    }

    // Client requests revision: Submitted → Rejected. Lighter than full dispute for simple rework.
    function requestRevision(uint256 _milestoneIndex)
        external
        onlyRole(CLIENT_ROLE)
    {
        if (_milestoneIndex >= milestones.length) revert InvalidMilestoneIndex();
        if (milestones[_milestoneIndex].status != MilestoneStatus.Submitted) {
            revert InvalidMilestoneStatus();
        }

        milestones[_milestoneIndex].status = MilestoneStatus.Rejected;
        emit RevisionRequested(_milestoneIndex);
    }

    // Provider retries rejected work: Rejected → Pending. Enables workflow loop for revision cycles.
    function retryMilestone(uint256 _milestoneIndex)
        external
        onlyRole(PROVIDER_ROLE)
    {
        if (_milestoneIndex >= milestones.length) revert InvalidMilestoneIndex();
        if (milestones[_milestoneIndex].status != MilestoneStatus.Rejected) {
            revert InvalidMilestoneStatus();
        }

        milestones[_milestoneIndex].status = MilestoneStatus.Pending;
        emit MilestoneRetried(_milestoneIndex);
    }

    // Either party triggers dispute: freezes funds, prevents approvals/withdrawals. Requires arbiter resolution.
    function raiseDispute(uint256 _milestoneIndex) external {
        if (
            msg.sender != client && msg.sender != provider
        ) revert Unauthorized();
        if (_milestoneIndex >= milestones.length) revert InvalidMilestoneIndex();

        disputeActive = true;
        milestones[_milestoneIndex].status = MilestoneStatus.Disputed;
        emit DisputeRaised(_milestoneIndex, msg.sender);
    }

    // Arbiter settles dispute: decides fund distribution (refund to client or pay provider). Uses call() + CEI pattern.
    function resolveDispute(uint256 _milestoneIndex, address recipient, uint256 amount)
        external
        onlyRole(ARBITER_ROLE)
        nonReentrant
    {
        if (_milestoneIndex >= milestones.length) revert InvalidMilestoneIndex();
        if (!disputeActive) revert InvalidMilestoneStatus();
        if (amount > address(this).balance) revert InsufficientBalance();

        // Update state BEFORE external call (Checks-Effects-Interactions)
        disputeActive = false;
        milestones[_milestoneIndex].status = MilestoneStatus.Released;

        // Transfer funds using call() for better gas semantics and compatibility
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        releasedAmount += amount;
        emit DisputeResolved(_milestoneIndex);
    }

    // Provider withdraws all approved milestone funds atomically. Blocked during disputes. Marks milestones Released.
    function withdrawFunds() external onlyRole(PROVIDER_ROLE) nonReentrant {
        if (disputeActive) revert DisputeActive();

        uint256 withdrawalAmount = 0;

        // Sum up all approved milestones
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status == MilestoneStatus.Approved) {
                withdrawalAmount += milestones[i].amount;
                milestones[i].status = MilestoneStatus.Released;  // Mark as paid to prevent double-claim
            }
        }

        if (withdrawalAmount == 0) revert InsufficientBalance();
        if (withdrawalAmount > address(this).balance) revert InsufficientBalance();

        releasedAmount += withdrawalAmount;

        // Use call() + check instead of transfer() for better error handling and gas efficiency
        (bool success, ) = provider.call{value: withdrawalAmount}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(withdrawalAmount);
    }
}
