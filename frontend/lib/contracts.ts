import { type Address } from "viem";

// ─── Contract Addresses ────────────────────────────────────────────────────────
// Replace with deployed addresses after running `hardhat deploy`
export const CONTRACT_ADDRESSES: Record<number, { factory: Address }> = {
  31337: { factory: "0x0000000000000000000000000000000000000000" }, // Hardhat local
  11155111: { factory: "0x0000000000000000000000000000000000000000" }, // Sepolia
};

// ─── ProjectFactory ABI ────────────────────────────────────────────────────────
export const FACTORY_ABI = [
  {
    name: "createProject",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "arbiter", type: "address" },
      { name: "milestoneTitles", type: "string[]" },
      { name: "milestoneAmounts", type: "uint256[]" },
    ],
    outputs: [{ name: "projectAddress", type: "address" }],
  },
  {
    name: "getProjectsByClient",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "client", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getProjectsByProvider",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "ProjectCreated",
    type: "event",
    inputs: [
      { name: "client", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "projectAddress", type: "address", indexed: true },
      { name: "totalAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── EscrowProject ABI ─────────────────────────────────────────────────────────
export const ESCROW_ABI = [
  {
    name: "getProjectDetails",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "client", type: "address" },
      { name: "provider", type: "address" },
      { name: "arbiter", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "releasedAmount", type: "uint256" },
      { name: "projectStatus", type: "uint8" },
    ],
  },
  {
    name: "getMilestones",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "title", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    name: "markMilestoneComplete",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "milestoneIndex", type: "uint256" }],
    outputs: [],
  },
  {
    name: "approveMilestone",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "milestoneIndex", type: "uint256" }],
    outputs: [],
  },
  {
    name: "requestRevision",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "milestoneIndex", type: "uint256" }],
    outputs: [],
  },
  {
    name: "raiseDispute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "milestoneIndex", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdrawFunds",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "MilestoneSubmitted",
    type: "event",
    inputs: [{ name: "milestoneIndex", type: "uint256", indexed: true }],
  },
  {
    name: "MilestoneApproved",
    type: "event",
    inputs: [{ name: "milestoneIndex", type: "uint256", indexed: true }],
  },
  {
    name: "RevisionRequested",
    type: "event",
    inputs: [{ name: "milestoneIndex", type: "uint256", indexed: true }],
  },
  {
    name: "DisputeRaised",
    type: "event",
    inputs: [
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "raisedBy", type: "address", indexed: true },
    ],
  },
  {
    name: "FundsWithdrawn",
    type: "event",
    inputs: [{ name: "amount", type: "uint256", indexed: false }],
  },
] as const;

export type MilestoneData = {
  title: string;
  amount: bigint;
  status: number;
};

export type ProjectDetails = {
  client: Address;
  provider: Address;
  arbiter: Address;
  totalAmount: bigint;
  releasedAmount: bigint;
  projectStatus: number;
};
