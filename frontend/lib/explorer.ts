import { hardhat, mainnet, sepolia } from "@/lib/wagmi";

const EXPLORERS: Record<number, string> = {
  [sepolia.id]: "https://sepolia.etherscan.io",
  [mainnet.id]: "https://etherscan.io",
  [hardhat.id]: "",
};

function base(chainId: number): string {
  return EXPLORERS[chainId] ?? "";
}

export function txUrl(chainId: number, hash: string): string {
  const b = base(chainId);
  return b ? `${b}/tx/${hash}` : "";
}

export function addressUrl(chainId: number, address: string): string {
  const b = base(chainId);
  return b ? `${b}/address/${address}` : "";
}
