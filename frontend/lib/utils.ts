import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatEther as viemFormatEther } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatEth(wei: bigint): string {
  const eth = viemFormatEther(wei);
  const num = parseFloat(eth);
  return `${num.toFixed(4)} ETH`;
}

export function formatEthFromString(wei: string): string {
  return formatEth(BigInt(wei));
}

export const MILESTONE_STATUS = {
  0: "Pending",
  1: "Submitted",
  2: "Approved",
  3: "Revision",
  4: "Disputed",
} as const;

export const PROJECT_STATUS = {
  0: "Active",
  1: "Disputed",
  2: "Completed",
  3: "Cancelled",
} as const;

export type MilestoneStatusKey = keyof typeof MILESTONE_STATUS;
export type ProjectStatusKey = keyof typeof PROJECT_STATUS;

// Contract only exposes `disputeActive` (bool); other states are inferred from financials.
export function deriveProjectStatus(
  disputeActive: boolean,
  releasedAmount: bigint,
  totalAmount: bigint
): 0 | 1 | 2 {
  if (disputeActive) return 1;
  if (totalAmount > 0n && releasedAmount >= totalAmount) return 2;
  return 0;
}
