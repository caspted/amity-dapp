"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, coinbaseWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [injectedWallet, metaMaskWallet, coinbaseWallet],
    },
  ],
  {
    appName: "Amity — Milestone Escrow",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "amity",
  }
);

export const wagmiConfig = createConfig({
  chains: [sepolia, hardhat],
  connectors,
  transports: {
    [sepolia.id]: http(),
    [hardhat.id]: http(),
  },
  ssr: true,
});

export { sepolia, hardhat };
