"use client";

import { useConnect } from "wagmi";
import { useMounted } from "@/hooks/use-mounted";

export function useMetaMask() {
  const mounted = useMounted();
  const { connectors, connect, status, error } = useConnect();

  const isInstalled =
    mounted && typeof window !== "undefined" && Boolean(window.ethereum?.isMetaMask);

  const metaMaskConnector =
    connectors.find((c) => c.id === "metaMask" || c.id === "metaMaskSDK") ??
    connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ??
    connectors.find((c) => c.id === "injected");

  const connectMetaMask = () => {
    if (!metaMaskConnector) return;
    connect({ connector: metaMaskConnector });
  };

  return {
    mounted,
    isInstalled,
    isConnecting: status === "pending",
    error,
    connect: connectMetaMask,
  };
}
