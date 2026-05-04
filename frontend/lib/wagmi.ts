"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, injectedWallet, coinbaseWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { hardhat, mainnet, sepolia } from "wagmi/chains";

const isDev = process.env.NODE_ENV === "development";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [metaMaskWallet, injectedWallet, coinbaseWallet],
    },
  ],
  {
    appName: "Amity — Milestone Escrow",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "amity",
  }
);

const chains = isDev ? ([sepolia, hardhat, mainnet] as const) : ([sepolia, mainnet] as const);

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [sepolia.id]: http(),
    [hardhat.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

export { hardhat, mainnet, sepolia };

export const APP_CHAINS = chains.filter((c) => c.id !== mainnet.id);
export const APP_CHAIN_IDS: number[] = APP_CHAINS.map((c) => c.id);
