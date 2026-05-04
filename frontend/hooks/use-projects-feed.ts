"use client";

import { useQuery } from "@apollo/client/react";
import { useAccount } from "wagmi";
import { useRole } from "@/hooks/use-role";
import { PROJECTS_BY_USER, RECENT_DISPUTES } from "@/lib/queries";
import { isSubgraphConfigured } from "@/lib/apollo";

// ─── Types matching the subgraph schema ───────────────────────────────────────

export interface SubgraphProject {
  id: string;
  client: string;
  provider: string;
  arbiter: string;
  totalAmount: string;
  releasedAmount: string;
  disputeActive: boolean;
  disputeDeadline: string;
  createdAtTimestamp: string;
}

export interface SubgraphDisputeEvent {
  id: string;
  project: { id: string };
  milestoneIndex: string;
  eventType: "RAISED" | "RESOLVED" | "TIMEOUT_REFUND";
  raisedBy: string | null;
  clientRecipient: string | null;
  clientAmount: string | null;
  providerRecipient: string | null;
  providerAmount: string | null;
  refundAmount: string | null;
  timestamp: string;
  txHash: string;
}

// ─── Project list hook (subgraph → on-chain fallback) ─────────────────────────

export function useProjectsFeed() {
  const { address } = useAccount();

  const {
    data: graphData,
    loading: graphLoading,
    error: graphError,
    refetch,
  } = useQuery<{ asClient: SubgraphProject[]; asProvider: SubgraphProject[] }>(
    PROJECTS_BY_USER,
    {
      variables: { address: address?.toLowerCase() ?? "" },
      skip: !address || !isSubgraphConfigured,
      pollInterval: 10_000,
    }
  );

  // On-chain fallback — used when subgraph isn't configured yet
  const onChain = useRole();

  const usingSubgraph = isSubgraphConfigured && !graphError && !!graphData;

  const clientProjects: string[] = usingSubgraph
    ? (graphData.asClient as SubgraphProject[]).map((p) => p.id)
    : (onChain.clientProjects as string[]);

  const providerProjects: string[] = usingSubgraph
    ? (graphData.asProvider as SubgraphProject[]).map((p) => p.id)
    : (onChain.providerProjects as string[]);

  const isLoading = usingSubgraph ? graphLoading : onChain.isLoading;

  return {
    clientProjects,
    providerProjects,
    isLoading,
    usingSubgraph,
    refetch,
  };
}

// ─── Dispute activity feed (subgraph only — no on-chain equivalent) ───────────

export function useDisputeFeed(limit = 20) {
  const { address } = useAccount();

  const { data, loading, error } = useQuery<{ disputeEvents: SubgraphDisputeEvent[] }>(
    RECENT_DISPUTES,
    {
      variables: { user: address?.toLowerCase() ?? "", limit },
      skip: !address || !isSubgraphConfigured,
      pollInterval: 10_000,
    }
  );

  return {
    disputes: (data?.disputeEvents ?? []) as SubgraphDisputeEvent[],
    isLoading: loading,
    isAvailable: isSubgraphConfigured && !error,
  };
}
