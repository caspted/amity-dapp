"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Amity — Milestone Escrow",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "amity-dapp-dev",
  chains: [sepolia, hardhat],
  ssr: true,
});

export { sepolia, hardhat };
