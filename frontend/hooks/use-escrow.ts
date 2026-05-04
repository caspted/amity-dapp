"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Address } from "viem";
import { ESCROW_ABI } from "@/lib/contracts";
import { deriveTxStatus } from "@/lib/tx-status";
import { useTxToast } from "@/hooks/use-tx-toast";

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

type MilestoneWriteFn =
  | "markMilestoneComplete"
  | "approveMilestone"
  | "requestRevision"
  | "raiseDispute"
  | "claimDisputeTimeout";

function useMilestoneWrite(
  contractAddress: Address | undefined,
  functionName: MilestoneWriteFn,
  successMsg: string
) {
  const queryClient = useQueryClient();
  const {
    writeContractAsync,
    data: hash,
    isPending,
    reset,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const isError = !!writeError || isReceiptError;
  const error = writeError ?? receiptError ?? null;

  const txState = deriveTxStatus({ isPending, isConfirming, isSuccess, isError, hash });
  useTxToast({ status: txState.status, hash: txState.hash, error, successMsg });

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      reset();
    }
  }, [isSuccess, queryClient, reset]);

  const execute = async (milestoneIndex: bigint) => {
    if (!contractAddress) return;
    await writeContractAsync({
      address: contractAddress,
      abi: ESCROW_ABI,
      functionName,
      args: [milestoneIndex],
    }).catch(() => {});
  };

  return {
    execute,
    isLoading: isPending || isConfirming,
    status: txState.status,
    hash: txState.hash,
  };
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

export function useClaimDisputeTimeout(address: Address | undefined) {
  return useMilestoneWrite(address, "claimDisputeTimeout", "Timeout claimed — funds refunded to client!");
}

export function useDisputeDeadline(address: Address | undefined) {
  return useReadContract({
    address,
    abi: ESCROW_ABI,
    functionName: "disputeDeadline",
    query: { enabled: !!address },
  });
}

export function useResolveDisputeWithSplit(address: Address | undefined) {
  const queryClient = useQueryClient();
  const { writeContractAsync, data: hash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } =
    useWaitForTransactionReceipt({ hash });

  const isError = !!writeError || isReceiptError;
  const error = writeError ?? receiptError ?? null;
  const txState = deriveTxStatus({ isPending, isConfirming, isSuccess, isError, hash });
  useTxToast({ status: txState.status, hash: txState.hash, error, successMsg: "Dispute resolved — funds distributed!" });

  useEffect(() => {
    if (isSuccess) { queryClient.invalidateQueries(); reset(); }
  }, [isSuccess, queryClient, reset]);

  const execute = async (milestoneIndex: bigint, clientAmount: bigint, providerAmount: bigint) => {
    if (!address) return;
    await writeContractAsync({
      address,
      abi: ESCROW_ABI,
      functionName: "resolveDisputeWithSplit",
      args: [milestoneIndex, clientAmount, providerAmount],
    }).catch(() => {});
  };

  return { execute, isLoading: isPending || isConfirming };
}

export function useSubmitEvidence(address: Address | undefined) {
  const queryClient = useQueryClient();
  const { writeContractAsync, data: hash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } =
    useWaitForTransactionReceipt({ hash });

  const isError = !!writeError || isReceiptError;
  const error = writeError ?? receiptError ?? null;
  const txState = deriveTxStatus({ isPending, isConfirming, isSuccess, isError, hash });
  useTxToast({ status: txState.status, hash: txState.hash, error, successMsg: "Evidence submitted." });

  useEffect(() => {
    if (isSuccess) { queryClient.invalidateQueries(); reset(); }
  }, [isSuccess, queryClient, reset]);

  const execute = async (milestoneIndex: bigint, evidenceURI: string) => {
    if (!address) return;
    await writeContractAsync({
      address,
      abi: ESCROW_ABI,
      functionName: "submitEvidence",
      args: [milestoneIndex, evidenceURI],
    }).catch(() => {});
  };

  return { execute, isLoading: isPending || isConfirming };
}

export function useWithdrawFunds(address: Address | undefined) {
  const queryClient = useQueryClient();
  const {
    writeContractAsync,
    data: hash,
    isPending,
    reset,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const isError = !!writeError || isReceiptError;
  const error = writeError ?? receiptError ?? null;

  const txState = deriveTxStatus({ isPending, isConfirming, isSuccess, isError, hash });
  useTxToast({ status: txState.status, hash: txState.hash, error, successMsg: "Funds withdrawn successfully!" });

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      reset();
    }
  }, [isSuccess, queryClient, reset]);

  const execute = async () => {
    if (!address) return;
    await writeContractAsync({
      address,
      abi: ESCROW_ABI,
      functionName: "withdrawFunds",
      args: [],
    }).catch(() => {});
  };

  return {
    execute,
    isLoading: isPending || isConfirming,
    status: txState.status,
    hash: txState.hash,
  };
}
