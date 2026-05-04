"use client";

import { useEffect, useRef } from "react";
import { useChainId } from "wagmi";
import { BaseError, UserRejectedRequestError } from "viem";
import { type TxStatus } from "@/lib/tx-status";
import { txUrl } from "@/lib/explorer";
import { toast } from "@/hooks/use-toast";

interface UseTxToastOptions {
  status: TxStatus;
  hash: `0x${string}` | undefined;
  error: Error | null | undefined;
  successMsg: string;
}

export function useTxToast({ status, hash, error, successMsg }: UseTxToastOptions) {
  const chainId = useChainId();
  const prevStatus = useRef<TxStatus>("idle");

  useEffect(() => {
    if (prevStatus.current === status) return;
    prevStatus.current = status;

    switch (status) {
      case "signing":
        toast({ title: "Confirm in your wallet…", variant: "default" });
        break;

      case "pending":
        toast({
          title: "Transaction submitted",
          description: hash ? shortenHash(hash) : undefined,
          variant: "default",
        });
        break;

      case "success": {
        const explorerLink = hash ? txUrl(chainId, hash) : "";
        toast({
          title: successMsg,
          description: explorerLink ? `View on Etherscan ↗` : undefined,
          variant: "success",
        });
        break;
      }

      case "error": {
        if (!error) break;
        const isRejected =
          error instanceof UserRejectedRequestError ||
          (error instanceof BaseError && error.walk((e) => e instanceof UserRejectedRequestError) !== null) ||
          ("code" in error && (error as { code: number }).code === 4001);

        if (isRejected) {
          toast({ title: "Transaction rejected", variant: "warning" });
        } else {
          const msg = error instanceof BaseError ? error.shortMessage : error.message;
          toast({
            title: "Transaction failed",
            description: msg?.slice(0, 100),
            variant: "error",
          });
        }
        break;
      }
    }
  }, [status, hash, error, successMsg, chainId]);
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}
