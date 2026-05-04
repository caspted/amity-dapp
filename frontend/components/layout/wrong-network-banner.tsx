"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { AlertTriangle } from "lucide-react";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { APP_CHAIN_IDS } from "@/lib/wagmi";

export function WrongNetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;
  if (APP_CHAIN_IDS.includes(chainId)) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 text-warning-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span>
          You&apos;re on an unsupported network. Switch to Sepolia to continue.
        </span>
      </div>
      <Button
        size="sm"
        variant="warning"
        isLoading={isPending}
        disabled={isPending}
        onClick={() => switchChain({ chainId: sepolia.id })}
      >
        Switch to Sepolia
      </Button>
    </div>
  );
}
