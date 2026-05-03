// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowProject.sol";

// Factory pattern: deploys isolated EscrowProject contracts for each agreement. Enables scalability + efficient lookups.
contract ProjectFactory {
    // All deployed projects + mappings for quick lookup by client/provider
    EscrowProject[] public projects;
    mapping(address => address[]) public projectsByClient;
    mapping(address => address[]) public projectsByProvider;

    // Indexed events for efficient subgraph/indexing filtering
    event ProjectCreated(
        address indexed client,
        address indexed provider,
        address indexed projectAddress,
        uint256 totalAmount
    );

    // Creates new EscrowProject: validates inputs, deploys contract, records project, transfers funds.
    function createProject(
        address _provider,
        address _arbiter,
        string[] calldata _milestoneTitles,
        uint256[] calldata _milestoneAmounts
    ) external payable returns (address) {
        require(_provider != address(0), "Invalid provider address");
        require(_arbiter != address(0), "Invalid arbiter address");
        require(_milestoneTitles.length > 0, "At least one milestone required");
        require(
            _milestoneTitles.length == _milestoneAmounts.length,
            "Arrays length mismatch"
        );

        // Calculate expected total from milestone amounts
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            totalAmount += _milestoneAmounts[i];
        }

        // Verify client sent EXACT deposit amount
        require(msg.value == totalAmount, "Incorrect deposit amount");

        // Deploy new escrow with client set to msg.sender (transaction sender)
        EscrowProject newProject = new EscrowProject(
            msg.sender,
            _provider,
            _arbiter,
            _milestoneTitles,
            _milestoneAmounts
        );

        // Record project for lookups and analytics
        projects.push(newProject);
        projectsByClient[msg.sender].push(address(newProject));
        projectsByProvider[_provider].push(address(newProject));

        // Transfer ETH to newly deployed escrow contract using call()
        (bool success, ) = address(newProject).call{value: msg.value}("");
        require(success, "Transfer to escrow failed");

        // Emit for The Graph indexing and frontend real-time updates
        emit ProjectCreated(msg.sender, _provider, address(newProject), totalAmount);

        return address(newProject);
    }

    // Get all projects where this address is client. Warning: array can get large, paginate on frontend.
    function getProjectsByClient(address _client)
        external
        view
        returns (address[] memory)
    {
        return projectsByClient[_client];
    }

    // Get all projects where this address is provider. Used by contractors for dashboard.
    function getProjectsByProvider(address _provider)
        external
        view
        returns (address[] memory)
    {
        return projectsByProvider[_provider];
    }

    // Total projects ever created (includes completed/disputed). Useful for pagination/analytics.
    function getProjectsCount() external view returns (uint256) {
        return projects.length;
    }

    // Get specific project by array index. Indexes permanent once set, never shift.
    function getProject(uint256 _index) external view returns (address) {
        return address(projects[_index]);
    }
}
