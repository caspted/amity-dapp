// ─── ProjectFactory Event Handlers ──────────────────────────────────────────
// Maps ProjectCreated events → Project entities + spawns EscrowProject template.

import { ProjectCreated } from "../generated/ProjectFactory/ProjectFactory";
import { EscrowProject as EscrowProjectTemplate } from "../generated/templates";
import { Project } from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

/**
 * handleProjectCreated
 *
 * Fired when ProjectFactory.createProject() emits ProjectCreated.
 * Creates a new Project entity and starts tracking the deployed EscrowProject
 * via a dynamic data source template.
 */
export function handleProjectCreated(event: ProjectCreated): void {
  // Use the deployed escrow contract address as the entity ID
  let projectId = event.params.projectAddress.toHexString();
  let project = new Project(projectId);

  project.client = event.params.client;
  project.provider = event.params.provider;
  project.totalAmount = event.params.totalAmount;
  project.releasedAmount = BigInt.fromI32(0);
  project.disputeActive = false;
  project.disputeDeadline = BigInt.fromI32(0);
  project.createdAtBlock = event.block.number;
  project.createdAtTimestamp = event.block.timestamp;
  project.txHash = event.transaction.hash;

  project.save();

  // Start indexing events from the newly deployed EscrowProject contract
  EscrowProjectTemplate.create(event.params.projectAddress);
}
