import { gql } from "@apollo/client";

// ─── Fragments ─────────────────────────────────────────────────────────────────

export const MILESTONE_FIELDS = gql`
  fragment MilestoneFields on Milestone {
    id
    index
    status
    updatedAt
  }
`;

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * All escrow projects where the given address is client or provider.
 * Mirrors the fields actually emitted by the subgraph schema (disputeActive,
 * disputeDeadline, createdAtTimestamp). Milestone titles/amounts are not
 * indexed — read those on-chain via useMilestones.
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
      disputeActive
      disputeDeadline
      createdAtTimestamp
    }
    asProvider: projects(where: { provider: $address }) {
      id
      client
      provider
      arbiter
      totalAmount
      releasedAmount
      disputeActive
      disputeDeadline
      createdAtTimestamp
    }
  }
`;

/**
 * Single project with all milestones (status only — titles/amounts come from chain).
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
      disputeActive
      disputeDeadline
      createdAtTimestamp
      milestones {
        ...MilestoneFields
      }
    }
  }
`;

/**
 * Recent dispute lifecycle events (raised, resolved, timeout-refund) involving
 * the given user (as raiser, client recipient, or provider recipient).
 */
export const RECENT_DISPUTES = gql`
  query RecentDisputes($user: Bytes!, $limit: Int!) {
    disputeEvents(
      where: {
        or: [
          { raisedBy: $user }
          { clientRecipient: $user }
          { providerRecipient: $user }
        ]
      }
      orderBy: timestamp
      orderDirection: desc
      first: $limit
    ) {
      id
      project {
        id
      }
      milestoneIndex
      eventType
      raisedBy
      clientRecipient
      clientAmount
      providerRecipient
      providerAmount
      refundAmount
      timestamp
      txHash
    }
  }
`;
