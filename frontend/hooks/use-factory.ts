"use client";

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from "wagmi";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Address } from "viem";
import { CONTRACT_ADDRESSES, FACTORY_ABI } from "@/lib/contracts";
import { toast } from "@/hooks/use-toast";
import { deriveTxStatus } from "@/lib/tx-status";
// toast kept for the "contract not deployed" guard below
import { useTxToast } from "@/hooks/use-tx-toast";

export function useCreateProject() {
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
  const chainId = useChainId();
  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.factory;

  const isError = !!writeError || isReceiptError;
  const error = writeError ?? receiptError ?? null;

  const txState = deriveTxStatus({ isPending, isConfirming, isSuccess, isError, hash });
  useTxToast({ status: txState.status, hash: txState.hash, error, successMsg: "Project deployed successfully!" });

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      reset();
    }
  }, [isSuccess, queryClient, reset]);

  const execute = async (args: {
    provider: Address;
    arbiter: Address;
    milestoneTitles: string[];
    milestoneAmounts: bigint[];
    totalValue: bigint;
  }) => {
    if (!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") {
      toast({
        title: "Contract Not Deployed",
        description: "ProjectFactory is not deployed on this network yet.",
        variant: "error",
      });
      return false;
    }

    await writeContractAsync({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: "createProject",
      args: [args.provider, args.arbiter, args.milestoneTitles, args.milestoneAmounts],
      value: args.totalValue,
    }).catch(() => {});
    return true;
  };

  return {
    execute,
    isLoading: isPending || isConfirming,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

export function useUserProjects(address: Address | undefined) {
  const chainId = useChainId();
  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.factory;

  const { data: clientProjects, isLoading: clientLoading, refetch: refetchClient } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getProjectsByClient",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!factoryAddress },
  });

  const { data: providerProjects, isLoading: providerLoading, refetch: refetchProvider } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getProjectsByProvider",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!factoryAddress },
  });

  return {
    clientProjects: clientProjects ?? [],
    providerProjects: providerProjects ?? [],
    isLoading: clientLoading || providerLoading,
    refetch: () => { refetchClient(); refetchProvider(); },
  };
}
