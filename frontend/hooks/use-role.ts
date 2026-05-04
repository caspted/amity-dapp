"use client";

import { useReadContract, usePublicClient } from "wagmi";
import { useAccount, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
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

      const logs = await publicClient.getLogs({
        address: factoryAddress,
        event: parseAbiItem(
          "event ProjectCreated(address indexed client, address indexed provider, address indexed projectAddress, uint256 totalAmount)"
        ),
        fromBlock: 0n,
        toBlock: "latest",
      });

      const allAddresses = logs
        .map((l) => l.args.projectAddress)
        .filter((a): a is Address => !!a);

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
          // skip projects that fail to read
        }
      }
      return results;
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