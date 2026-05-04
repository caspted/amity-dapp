// ─── EscrowProject Event Handlers ───────────────────────────────────────────
// Maps all EscrowProject events → corresponding subgraph entities.

import {
  DepositReceived,
  MilestoneSubmitted,
  MilestoneApproved,
  RevisionRequested,
  MilestoneRetried,
  DisputeRaised,
  DisputeResolved,
  DisputeDeadlineRefund,
  EvidenceSubmitted,
  FundsWithdrawn,
} from "../generated/templates/EscrowProject/EscrowProject";
import {
  Project,
  Milestone,
  DisputeEvent,
  EvidenceSubmission,
  Withdrawal,
} from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a deterministic milestone entity ID from project address + index */
function milestoneId(projectAddress: string, index: BigInt): string {
  return projectAddress + "-" + index.toString();
}

/** Build a unique event ID from tx hash + log index */
function eventId(txHash: string, logIndex: BigInt): string {
  return txHash + "-" + logIndex.toString();
}

/** Load or create a Milestone entity — defaults to Pending (0) */
function getOrCreateMilestone(
  projectAddress: string,
  index: BigInt,
  timestamp: BigInt
): Milestone {
  let id = milestoneId(projectAddress, index);
  let milestone = Milestone.load(id);
  if (milestone == null) {
    milestone = new Milestone(id);
    milestone.project = projectAddress;
    milestone.index = index;
    milestone.status = 0; // Pending
    milestone.updatedAt = timestamp;
  }
  return milestone;
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

/**
 * handleDepositReceived
 * Fired when ETH is deposited into the escrow contract via receive().
 * No entity update needed — totalAmount is already set from ProjectCreated.
 */
export function handleDepositReceived(_event: DepositReceived): void {
  // Deposit amount already stored in Project.totalAmount from factory handler.
  // This event confirms funds are in custody. No additional entity update needed.
}

/**
 * handleMilestoneSubmitted
 * Provider marks work complete → status changes to Submitted (1).
 */
export function handleMilestoneSubmitted(event: MilestoneSubmitted): void {
  let projectAddress = event.address.toHexString();
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 1; // Submitted
  milestone.updatedAt = event.block.timestamp;
  milestone.save();
}

/**
 * handleMilestoneApproved
 * Client approves submitted work → status changes to Approved (2).
 */
export function handleMilestoneApproved(event: MilestoneApproved): void {
  let projectAddress = event.address.toHexString();
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 2; // Approved
  milestone.updatedAt = event.block.timestamp;
  milestone.save();
}

/**
 * handleRevisionRequested
 * Client requests revision → status changes to Rejected (3).
 */
export function handleRevisionRequested(event: RevisionRequested): void {
  let projectAddress = event.address.toHexString();
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 3; // Rejected
  milestone.updatedAt = event.block.timestamp;
  milestone.save();
}

/**
 * handleMilestoneRetried
 * Provider retries rejected work → status resets to Pending (0).
 */
export function handleMilestoneRetried(event: MilestoneRetried): void {
  let projectAddress = event.address.toHexString();
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 0; // Pending
  milestone.updatedAt = event.block.timestamp;
  milestone.save();
}

/**
 * handleDisputeRaised
 * Either party raises a dispute → milestone status becomes Disputed (4),
 * project disputeActive becomes true, deadline is recorded.
 */
export function handleDisputeRaised(event: DisputeRaised): void {
  let projectAddress = event.address.toHexString();

  // Update milestone status
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 4; // Disputed
  milestone.updatedAt = event.block.timestamp;
  milestone.save();

  // Update project dispute state
  let project = Project.load(projectAddress);
  if (project != null) {
    project.disputeActive = true;
    project.disputeDeadline = event.params.deadline;
    project.save();
  }

  // Create dispute event entity
  let id = eventId(
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  let dispute = new DisputeEvent(id);
  dispute.project = projectAddress;
  dispute.milestoneIndex = event.params.index;
  dispute.eventType = "RAISED";
  dispute.raisedBy = event.params.raisedBy;
  dispute.deadline = event.params.deadline;
  dispute.timestamp = event.block.timestamp;
  dispute.txHash = event.transaction.hash;
  dispute.save();
}

/**
 * handleDisputeResolved
 * Arbiter resolves the dispute → milestone becomes Released (5),
 * project disputeActive becomes false, releasedAmount updated.
 */
export function handleDisputeResolved(event: DisputeResolved): void {
  let projectAddress = event.address.toHexString();

  // Update milestone status
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 5; // Released
  milestone.updatedAt = event.block.timestamp;
  milestone.save();

  // Update project
  let project = Project.load(projectAddress);
  if (project != null) {
    project.disputeActive = false;
    project.releasedAmount = project.releasedAmount.plus(
      event.params.clientAmount.plus(event.params.providerAmount)
    );
    project.save();
  }

  // Create dispute resolved event
  let id = eventId(
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  let dispute = new DisputeEvent(id);
  dispute.project = projectAddress;
  dispute.milestoneIndex = event.params.index;
  dispute.eventType = "RESOLVED";
  dispute.clientRecipient = event.params.clientRecipient;
  dispute.clientAmount = event.params.clientAmount;
  dispute.providerRecipient = event.params.providerRecipient;
  dispute.providerAmount = event.params.providerAmount;
  dispute.timestamp = event.block.timestamp;
  dispute.txHash = event.transaction.hash;
  dispute.save();
}

/**
 * handleDisputeDeadlineRefund
 * Client claims timeout refund → milestone Released (5),
 * project disputeActive false.
 */
export function handleDisputeDeadlineRefund(
  event: DisputeDeadlineRefund
): void {
  let projectAddress = event.address.toHexString();

  // Update milestone
  let milestone = getOrCreateMilestone(
    projectAddress,
    event.params.index,
    event.block.timestamp
  );
  milestone.status = 5; // Released
  milestone.updatedAt = event.block.timestamp;
  milestone.save();

  // Update project
  let project = Project.load(projectAddress);
  if (project != null) {
    project.disputeActive = false;
    project.releasedAmount = project.releasedAmount.plus(
      event.params.refundedAmount
    );
    project.save();
  }

  // Create timeout event
  let id = eventId(
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  let dispute = new DisputeEvent(id);
  dispute.project = projectAddress;
  dispute.milestoneIndex = event.params.index;
  dispute.eventType = "TIMEOUT_REFUND";
  dispute.refundAmount = event.params.refundedAmount;
  dispute.timestamp = event.block.timestamp;
  dispute.txHash = event.transaction.hash;
  dispute.save();
}

/**
 * handleEvidenceSubmitted
 * Client or provider submits evidence URI during a dispute.
 */
export function handleEvidenceSubmitted(event: EvidenceSubmitted): void {
  let projectAddress = event.address.toHexString();
  let id = eventId(
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  let evidence = new EvidenceSubmission(id);
  evidence.project = projectAddress;
  evidence.milestoneIndex = event.params.index;
  evidence.submittedBy = event.params.submittedBy;
  evidence.evidenceURI = event.params.evidenceURI;
  evidence.timestamp = event.block.timestamp;
  evidence.txHash = event.transaction.hash;
  evidence.save();
}

/**
 * handleFundsWithdrawn
 * Provider withdraws approved milestone funds.
 * Updates project releasedAmount and creates a Withdrawal entity.
 */
export function handleFundsWithdrawn(event: FundsWithdrawn): void {
  let projectAddress = event.address.toHexString();

  // Update project released amount
  let project = Project.load(projectAddress);
  if (project != null) {
    project.releasedAmount = project.releasedAmount.plus(event.params.amount);
    project.save();
  }

  // Create withdrawal entity
  let id = eventId(
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  let withdrawal = new Withdrawal(id);
  withdrawal.project = projectAddress;
  withdrawal.amount = event.params.amount;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.txHash = event.transaction.hash;
  withdrawal.save();
}
