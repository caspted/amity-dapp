import { gql } from "@apollo/client";

// ─── Fragments ─────────────────────────────────────────────────────────────────

export const MILESTONE_FIELDS = gql`
  fragment MilestoneFields on Milestone {
    id
    index
    title
    amount
    status
    updatedAt
  }
`;

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * All escrow projects where the given address is client or provider.
 * Replaces the dual useReadContract calls in use-role.ts for list views.
 * Activated automatically when NEXT_PUBLIC_SUBGRAPH_URL is set (Dev 2's deliverable).
 */
export const PROJECTS_BY_USER = gql`
  query ProjectsByUser($address: Bytes!) {
    asClient: projects(where: { client: $address }) {
      id
      client
      provider
      arbiter
      totalAmount
      releasedAmount
      status
      createdAt
    }
    asProvider: projects(where: { provider: $address }) {
      id
      client
      provider
      arbiter
      totalAmount
      releasedAmount
      status
      createdAt
    }
  }
`;

/**
 * Single project with all milestones.
 * Provides instant seed data for the project detail page before the
 * on-chain read resolves.
 */
export const PROJECT_FULL = gql`
  ${MILESTONE_FIELDS}
  query ProjectFull($id: ID!) {
    project(id: $id) {
      id
      client
      provider
      arbiter
      totalAmount
      releasedAmount
      status
      createdAt
      milestones {
        ...MilestoneFields
      }
    }
  }
`;

/**
 * Recent activity feed for the dashboard.
 * Derived from contract events indexed by Dev 2's subgraph mappings
 * (ProjectCreated, MilestoneApproved, MilestoneSubmitted, DisputeRaised, etc.)
 */
export const RECENT_ACTIVITY = gql`
  query RecentActivity($user: Bytes!, $limit: Int!) {
    activities(
      where: { actor: $user }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $limit
    ) {
      id
      type
      project {
        id
      }
      milestoneIndex
      actor
      txHash
      blockTimestamp
    }
  }
`;
