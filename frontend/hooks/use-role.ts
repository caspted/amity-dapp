"use client";

import { useReadContract, usePublicClient } from "wagmi";
import { useAccount, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { CONTRACT_ADDRESSES, FACTORY_ABI, ESCROW_ABI } from "@/lib/contracts";

export type UserRole = "client" | "provider" | "both" | "none";

export function useRole() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.factory;
  const publicClient = usePublicClient();

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

  const { data: arbiterProjects = [], isLoading: arbiterLoading } = useQuery({
    queryKey: ["arbiterProjects", address, chainId, factoryAddress],
    enabled: !!address && !!factoryAddress && !!publicClient,
    queryFn: async () => {
      if (!address || !factoryAddress || !publicClient) return [];

      try {
        // Get total number of deployed projects
        const count = (await publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: "getProjectsCount",
        })) as bigint;

        if (count === 0n) return [];

        // Fetch every project address by index
        const allAddresses = (await Promise.all(
          Array.from({ length: Number(count) }, (_, i) =>
            publicClient.readContract({
              address: factoryAddress,
              abi: FACTORY_ABI,
              functionName: "getProject",
              args: [BigInt(i)],
            })
          )
        )) as Address[];

        // Filter down to projects where the connected wallet is the arbiter
        const results: Address[] = [];
        for (const projAddr of allAddresses) {
          try {
            const detail = (await publicClient.readContract({
              address: projAddr,
              abi: ESCROW_ABI,
              functionName: "getProjectDetails",
            })) as [Address, Address, Address, bigint, bigint, boolean];
            if (detail[2].toLowerCase() === address.toLowerCase()) {
              results.push(projAddr);
            }
          } catch {
            // skip contracts that fail to read
          }
        }
        return results;
      } catch {
        return [];
      }
    },
  });

  const isClient = (clientProjects?.length ?? 0) > 0;
  const isProvider = (providerProjects?.length ?? 0) > 0;
  const isArbiter = (arbiterProjects?.length ?? 0) > 0;

  let role: UserRole = "none";
  if (isClient && isProvider) role = "both";
  else if (isClient) role = "client";
  else if (isProvider) role = "provider";

  return {
    role,
    isClient,
    isProvider,
    isArbiter,
    isLoading: clientLoading || providerLoading || arbiterLoading,
    clientProjects: clientProjects ?? [],
    providerProjects: providerProjects ?? [],
    arbiterProjects: arbiterProjects as Address[],
    isConnected,
  };
}
