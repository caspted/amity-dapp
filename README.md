# Amity dApp

Amity is a decentralized escrow platform designed to facilitate secure, milestone-based agreements between clients and service providers (freelancers). It ensures trust and accountability by locking funds in a smart contract and releasing them only upon the successful completion and approval of predefined milestones. In the event of a disagreement, a designated neutral Arbiter can resolve disputes.

## 📸 Screenshot

![Amity App Screenshot](screenshot-placeholder.png)

## 👥 Group Members & Roles

- **[Member Name Placeholder]** - [Role Placeholder]
- **[Member Name Placeholder]** - [Role Placeholder]

## 🌟 Key Features

- **Milestone-Based Escrow**: Funds are locked upfront and released incrementally as milestones are submitted by the provider and approved by the client.
- **Role-Based Access Control**: Strict roles for **Client** (funds owner), **Provider** (service executor), and **Arbiter** (neutral dispute resolver).
- **Dispute Resolution**: If a disagreement occurs, either party can raise a dispute, freezing the funds until the Arbiter resolves the issue or splits the funds.
- **Factory Pattern**: Each project gets its own isolated, immutable `EscrowProject` smart contract deployed via the `ProjectFactory` for enhanced security and scalability.
- **Real-Time Data Indexing**: Uses The Graph to efficiently index blockchain events for a fast and responsive frontend experience.

## 🛠 Tech Stack

The project is structured as a monorepo containing the frontend, smart contracts, and subgraph.

### Frontend (`/frontend`)
- **Framework**: [Next.js](https://nextjs.org/) (App Router), React 19
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Web3 Integration**: [Wagmi](https://wagmi.sh/), [Viem](https://viem.sh/), [RainbowKit](https://www.rainbowkit.com/) for wallet connections.
- **Data Fetching**: [Apollo Client](https://www.apollographql.com/docs/react/) for querying The Graph.

### Smart Contracts (`/hardhat`)
- **Language**: Solidity (^0.8.20)
- **Framework**: [Hardhat](https://hardhat.org/)
- **Libraries**: [OpenZeppelin Contracts](https://www.openzeppelin.com/) (AccessControl, ReentrancyGuard)

### Indexing (`/subgraph`)
- **Protocol**: [The Graph](https://thegraph.com/)
- **Language**: AssemblyScript / GraphQL

## 📂 Project Structure

```
amity-dapp/
├── frontend/          # Next.js web application
├── hardhat/           # Smart contracts, tests, and deployment scripts
└── subgraph/          # The Graph manifest, schema, and mappings
```

## 🚀 Getting Started

Follow these instructions to run the project locally.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm
- MetaMask or another web3 wallet

### 1. Smart Contracts

Navigate to the `hardhat` directory to compile and test the contracts.

```bash
cd hardhat
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### 2. Subgraph

Navigate to the `subgraph` directory to build the indexing logic.

```bash
cd subgraph
npm install

# Generate types from GraphQL schema and ABIs
npm run codegen

# Build the subgraph
npm run build
```

### 3. Frontend

Navigate to the `frontend` directory to start the web application.

```bash
cd frontend
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the dApp.

## 🌍 Deployment details

The smart contracts are currently configured for deployment on the **Ethereum Sepolia Testnet**. The frontend application connects to MetaMask and interacts with the deployed contract.

- **Live Frontend URL**: [Deployed Site URL Placeholder]
- **ProjectFactory Address**: `0x35255dB702fE5cA1Cad3AdbF24Fd5E0C825d0096` (Sepolia)
- **Subgraph Endpoint**: Hosted on The Graph Studio (`amity-subgraph`)

## 📜 Contract Flow

1. **Creation**: Client calls `ProjectFactory.createProject()` specifying the Provider, Arbiter, milestones, and depositing the total project amount in ETH.
2. **Submission**: Provider completes a milestone and calls `markMilestoneComplete()`.
3. **Approval**: Client reviews the work and calls `approveMilestone()`.
4. **Withdrawal**: Provider calls `withdrawFunds()` to pull the ETH for approved milestones.
5. **Disputes (If necessary)**:
   - Either party can call `raiseDispute()`.
   - Arbiter investigates and calls `resolveDispute()` or `resolveDisputeWithSplit()`.

## 📚 Credits & References

- [Tutorials/Docs used Placeholder]
- [AI tools used Placeholder]
- [Other references]

## 📄 License

This project is licensed under the MIT License.
