"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address } from "viem";
import { ESCROW_ABI } from "@/lib/contracts";
import { toast } from "@/hooks/use-toast";

export function useProjectDetails(address: Address | undefined) {
  return useReadContract({
    address,
    abi: ESCROW_ABI,
    functionName: "getProjectDetails",
    query: { enabled: !!address },
  });
}

export function useMilestones(address: Address | undefined) {
  return useReadContract({
    address,
    abi: ESCROW_ABI,
    functionName: "getMilestones",
    query: { enabled: !!address },
  });
}

function useMilestoneWrite(
  contractAddress: Address | undefined,
  functionName: "markMilestoneComplete" | "approveMilestone" | "requestRevision" | "raiseDispute",
  successMsg: string
) {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const execute = async (milestoneIndex: bigint) => {
    if (!contractAddress) return;
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName,
        args: [milestoneIndex],
      });
      toast({ title: successMsg, variant: "success" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Transaction Failed", description: message.slice(0, 80), variant: "error" });
    }
  };

  return { execute, isLoading: isPending || isConfirming };
}

export function useMarkComplete(address: Address | undefined) {
  return useMilestoneWrite(address, "markMilestoneComplete", "Milestone marked as complete!");
}

export function useApprove(address: Address | undefined) {
  return useMilestoneWrite(address, "approveMilestone", "Milestone approved — funds released!");
}

export function useRequestRevision(address: Address | undefined) {
  return useMilestoneWrite(address, "requestRevision", "Revision requested.");
}

export function useRaiseDispute(address: Address | undefined) {
  return useMilestoneWrite(address, "raiseDispute", "Dispute raised — arbiter notified.");
}

export function useWithdrawFunds(address: Address | undefined) {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const execute = async () => {
    if (!address) return;
    try {
      await writeContractAsync({
        address,
        abi: ESCROW_ABI,
        functionName: "withdrawFunds",
        args: [],
      });
      toast({ title: "Funds withdrawn successfully!", variant: "success" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Withdrawal Failed", description: message.slice(0, 80), variant: "error" });
    }
  };

  return { execute, isLoading: isPending || isConfirming };
}
