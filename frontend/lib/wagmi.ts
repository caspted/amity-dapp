"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, injectedWallet, coinbaseWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { hardhat, mainnet, sepolia } from "wagmi/chains";

const isDev = process.env.NODE_ENV === "development";

// RainbowKit requires a real WalletConnect Cloud projectId for any WC-based
// wallet (MetaMask mobile, Coinbase, etc.). When one is not supplied, we fall
// back to injected-only so the app still builds and runs with the MetaMask
// browser extension.
const wcProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";
const hasWcProjectId = wcProjectId.length > 0;

const wallets = hasWcProjectId
  ? [metaMaskWallet, injectedWallet, coinbaseWallet]
  : [injectedWallet];

const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets,
    },
  ],
  {
    appName: "Amity — Milestone Escrow",
    // Any non-empty string satisfies RainbowKit's init check; the value is only
    // actually used by WalletConnect-based wallets (which we filter out above
    // when no real projectId is configured).
    projectId: hasWcProjectId ? wcProjectId : "amity-no-walletconnect",
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
