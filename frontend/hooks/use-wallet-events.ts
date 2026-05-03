"use client";

import { useEffect, useRef } from "react";
import { useAccountEffect, useChainId } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export function useWalletEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const chainId = useChainId();
  const previousChainId = useRef<number | undefined>(undefined);

  useAccountEffect({
    onConnect({ address }) {
      toast({
        title: "Wallet connected",
        description: `${address.slice(0, 6)}…${address.slice(-4)}`,
        variant: "success",
      });
    },
    onDisconnect() {
      queryClient.invalidateQueries();
      toast({ title: "Wallet disconnected", variant: "default" });
      router.push("/");
    },
  });

  useEffect(() => {
    if (previousChainId.current !== undefined && previousChainId.current !== chainId) {
      queryClient.invalidateQueries();
      toast({ title: "Network changed", variant: "default" });
    }
    previousChainId.current = chainId;
  }, [chainId, queryClient]);
}
