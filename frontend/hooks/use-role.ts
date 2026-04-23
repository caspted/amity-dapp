"use client";

import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { CONTRACT_ADDRESSES, FACTORY_ABI } from "@/lib/contracts";
import { useChainId } from "wagmi";

export type UserRole = "client" | "provider" | "both" | "none";

export function useRole() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.factory;

  const { data: clientProjects, isLoading: clientLoading } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getProjectsByClient",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!factoryAddress },
  });

  const { data: providerProjects, isLoading: providerLoading } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getProjectsByProvider",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!factoryAddress },
  });

  const isClient = (clientProjects?.length ?? 0) > 0;
  const isProvider = (providerProjects?.length ?? 0) > 0;

  let role: UserRole = "none";
  if (isClient && isProvider) role = "both";
  else if (isClient) role = "client";
  else if (isProvider) role = "provider";

  return {
    role,
    isClient,
    isProvider,
    isLoading: clientLoading || providerLoading,
    clientProjects: clientProjects ?? [],
    providerProjects: providerProjects ?? [],
    isConnected,
  };
}
