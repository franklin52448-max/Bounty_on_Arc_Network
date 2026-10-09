# Bounty DApp - Decentralized Bug Bounty Platform

A full-stack decentralized application (dApp) built on Ethereum that enables organizations to create bug bounties and security researchers to submit vulnerabilities and claim rewards. This project combines a Solidity smart contract backend with a modern React frontend, using ethers.js for blockchain interaction.

---

## 📋 Table of Contents

- Overview
- Features
- Architecture
- Tech Stack
- Project Structure
- Smart Contract Integration
- Frontend Application
- Getting Started
- Environment Variables
- Running the Application
- Usage Guide
- User Flows
- Testing
- Deployment
- Security Considerations
- Contributing
- License

---

## 🔍 Overview

The **Bounty DApp** is a permissionless platform where:

- **Organizations / Project Owners** can create bounty programs by locking ETH rewards in a smart contract.
- **Security Researchers / White-hat Hackers** can submit vulnerability reports tied to a specific bounty.
- **Owners** review submissions and approve them, which automatically transfers the reward to the researcher.
- **Researchers** can also be rejected, and the owner can withdraw funds if the bounty expires or is cancelled.

All interactions are transparent, on-chain, and require no centralized intermediary.

---

## ✨ Features

### Core Features

- 🔐 **Wallet Connection** – MetaMask / WalletConnect integration via ethers.js.
- 💰 **Create Bounty** – Fund a bounty with ETH and define metadata (title, description, deadline, reward).
- 📝 **Submit Vulnerability** – Researchers submit a report (IPFS hash or text) against an active bounty.
- ✅ **Approve / Reject Submission** – Owner decides the outcome of each submission.
- 🏆 **Automatic Payout** – Approved submissions trigger instant ETH transfer to the researcher.
- ⏳ **Deadline & Cancellation** – Owner can cancel an unfulfilled bounty after expiration.
- 📊 **Dashboard** – View all bounties, your submissions, and statuses.
- 🔎 **Bounty Detail Page** – Full metadata, submission list, and actions.

### UX Enhancements

- Toast notifications for transactions.
- Loading states and pending transaction indicators.
- Network guard (only allowed on supported chains, e.g., Sepolia / Goerli / Localhost).
- Responsive design (TailwindCSS).
- Error handling for rejected transactions and reverts.

---

## 🏗 Architecture
```
┌──────────────────────────────────────────────────────────┐
│                     USER (Browser)                       │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │            React Frontend (Vite)                 │   │
│   │  ┌────────────┐  ┌────────────┐  ┌───────────┐   │   │
│   │  │  Pages/UI  │  │  Hooks     │  │  Context  │   │   │
│   │  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘   │   │
│   │        │               │               │         │   │
│   │        └───────────────┼───────────────┘         │   │
│   │                        │                         │   │
│   │                ┌───────▼────────┐                │   │
│   │                │  ethers.js     │                │   │
│   │                │  Contract API  │                │   │
│   │                └───────┬────────┘                │   │
│   └────────────────────────┼─────────────────────────┘   │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             │ JSON-RPC
                             ▼
                ┌────────────────────────┐
                │   Ethereum Network     │
                │  (Sepolia / Mainnet)   │
                │                        │
                │  ┌──────────────────┐  │
                │  │  Bounty Contract │  │
                │  └──────────────────┘  │
                └────────────────────────┘
```


---

## 🛠 Tech Stack

| **Layer**           | **Technology**                   |
| ------------------- | -------------------------------- |
| Smart Contract      | Solidity ^0.8.20                 |
| Dev Framework       | Hardhat / Foundry                |
| Frontend            | React 18 + Vite                  |
| Styling             | TailwindCSS                      |
| Blockchain Library  | ethers.js v6                     |
| Wallet              | MetaMask (via `window.ethereum`) |
| State Management    | React Context + Hooks            |
| Routing             | React Router v6                  |
| Notifications       | react-hot-toast                  |
| Storage (optional)  | IPFS (via Pinata / web3.storage) |

---

## 📁 Project Structure
```
bounty-dapp/
├── contracts/
│   └── Bounty.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── Bounty.test.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── abi/
│   │   │   └── Bounty.json          # Contract ABI
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── WalletConnect.jsx
│   │   │   ├── BountyCard.jsx
│   │   │   ├── CreateBountyForm.jsx
│   │   │   ├── SubmissionForm.jsx
│   │   │   ├── SubmissionList.jsx
│   │   │   └── TransactionButton.jsx
│   │   ├── context/
│   │   │   └── Web3Context.jsx       # Wallet + provider + signer
│   │   ├── hooks/
│   │   │   ├── useBounties.js
│   │   │   ├── useBounty.js
│   │   │   └── useContract.js
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── CreateBounty.jsx
│   │   │   ├── BountyDetail.jsx
│   │   │   └── MySubmissions.jsx
│   │   ├── utils/
│   │   │   ├── contract.js           # getContract() helper
│   │   │   ├── format.js             # wei/eth, dates
│   │   │   └── constants.js          # addresses, chain IDs
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── hardhat.config.js
├── package.json
└── README.md
```


---

## 🔗 Smart Contract Integration

### Contract ABI Location

The compiled ABI is stored at:
```
frontend/src/abi/Bounty.json
```


Copy this file from `artifacts/contracts/Bounty.sol/Bounty.json` after compilation.

### Contract Address

The deployed address lives in `.env`:
```
VITE_CONTRACT_ADDRESS=0xYourContractAddress
VITE_CHAIN_ID=11155111
```


### Helper — `utils/contract.js`
```
import { ethers } from "ethers";
import BountyABI from "../abi/Bounty.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export function getReadContract(provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, BountyABI, provider);
}

export function getWriteContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, BountyABI, signer);
}
```


### Key Contract Functions Used in UI

| **Function**                                | **Caller** | **UI Trigger**     |
| ------------------------------------------- | ---------- | ------------------ |
| `createBounty(title, desc, deadline)`       | Owner      | Create Bounty Form |
| `submitVulnerability(bountyId, reportHash)` | Researcher | Submission Form    |
| `approveSubmission(bountyId, subId)`        | Owner      | "Approve" button   |
| `rejectSubmission(bountyId, subId)`         | Owner      | "Reject" button    |
| `cancelBounty(bountyId)`                    | Owner      | "Cancel" button    |
| `withdraw(bountyId)`                        | Owner      | "Withdraw" button  |
| `getBounty(bountyId)`                       | Anyone     | Bounty Detail page |
| `getSubmissions(bountyId)`                  | Anyone     | Submission List    |

### Events Listened To
```
contract.on("BountyCreated", (id, owner, reward) => { ... });
contract.on("SubmissionMade", (bountyId, subId, researcher) => { ... });
contract.on("SubmissionApproved", (bountyId, subId) => { ... });
```


These events update the UI in real time without polling.

---

## 🎨 Frontend Application

### Web3Context

Provides:

- `provider` — read-only ethers provider
- `signer` — connected wallet signer
- `account` — current address
- `chainId` — current network
- `connectWallet()` / `disconnectWallet()`
```
const { account, signer, connectWallet } = useWeb3();
```


### Main Pages

#### 1. Home (`/`)

- Grid of all active bounties (`BountyCard` components).
- Filters: Active / Expired / Mine.

#### 2. Create Bounty (`/create`)

- Form fields: Title, Description, Reward (ETH), Deadline.
- On submit: `contract.createBounty(...)` with `{ value: parseEther(reward) }`.

#### 3. Bounty Detail (`/bounty/:id`)

- Full bounty metadata.
- Owner view: Approve/Reject/Cancel/Withdraw buttons.
- Researcher view: Submit vulnerability form.
- Submission list with statuses.

#### 4. My Submissions (`/my-submissions`)

- Wallet-filtered list of submissions and their statuses.

### Transaction Handling

Every write action uses a reusable `TransactionButton` that:

1. Disables the button.
2. Shows "Pending…" after `tx.wait()`.
3. Fires a toast on success or error.
```
const tx = await contract.approveSubmission(bountyId, subId);
toast.loading("Approving...", { id: tx.hash });
await tx.wait();
toast.success("Approved!", { id: tx.hash });
```


---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- MetaMask browser extension
- Git

### 1. Clone the Repository
```
git clone https://github.com/your-username/bounty-dapp.git
cd bounty-dapp
```


### 2. Install Root (Contract) Dependencies
```
npm install
```


### 3. Install Frontend Dependencies
```
cd frontend
npm install
```


### 4. Compile the Contract
```
cd ..
npx hardhat compile
```


### 5. Copy ABI to Frontend
```
cp artifacts/contracts/Bounty.sol/Bounty.json frontend/src/abi/Bounty.json
```


---

## 🔐 Environment Variables

### Root `.env`
```
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key
```


### Frontend `frontend/.env`
```
VITE_CONTRACT_ADDRESS=0xDeployedContractAddress
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```


---

## ▶ Running the Application

### Start Local Blockchain
```
npx hardhat node
```


### Deploy Contract Locally
```
npx hardhat run scripts/deploy.js --network localhost
```


### Start Frontend
```
cd frontend
npm run dev
```


Visit `http://localhost:5173`.

---

## 📖 Usage Guide

### As a Bounty Owner

1. Connect MetaMask.
2. Click **Create Bounty** → fill form → confirm transaction.
3. Share the bounty link with researchers.
4. Review submissions on the bounty detail page.
5. Approve a submission → reward auto-transfers.
6. Reject others, or cancel/withdraw if expired.

### As a Researcher

1. Connect MetaMask.
2. Browse bounties on Home.
3. Open a bounty → submit vulnerability report (IPFS hash or text).
4. Wait for owner's decision.
5. If approved → ETH arrives automatically.

---

## 🔄 User Flows

### Create Bounty Flow
```
Connect Wallet → Fill Form → Sign Tx → Contract stores bounty + ETH
   → Event emitted → Home page refreshes → Bounty visible
```


### Submission + Approval Flow
```
Researcher submits → Contract stores submission
   → Owner reviews → approveSubmission()
   → Contract transfers ETH → Researcher wallet credited
   → Event emitted → UI updates
```


### Rejection / Cancellation Flow
```
Owner rejects → submission marked rejected
Owner cancels after deadline → withdraw(bountyId) → ETH returned
```


---

## 🧪 Testing

### Contract Tests
```
npx hardhat test
```


Covers:

- Bounty creation with correct reward.
- Submission by non-owner.
- Approval → payout correctness.
- Rejection path.
- Cancel + withdraw after deadline.
- Revert cases (unauthorized, insufficient funds).

### Frontend Tests (optional)
```
cd frontend
npm run test
```


Using Vitest + React Testing Library.

---

## 🚢 Deployment

### Deploy Contract to Sepolia
```
npx hardhat run scripts/deploy.js --network sepolia
```


### Verify on Etherscan
```
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```


### Deploy Frontend (Vercel / Netlify)
```
cd frontend
npm run build
```


Upload `dist/` folder or connect GitHub repo to Vercel.

**Environment variables to set on Vercel:**

- `VITE_CONTRACT_ADDRESS`
- `VITE_CHAIN_ID`
- `VITE_RPC_URL`

---

## 🛡 Security Considerations

- **Reentrancy**: Contract uses checks-effects-interactions pattern.
- **Access Control**: Only the bounty owner can approve/reject/cancel.
- **Deadline Enforcement**: Submissions blocked after deadline.
- **Fund Locking**: Rewards held by contract until approval or cancellation.
- **Frontend Guard**: Rejects wrong network; prompts user to switch.
- **No Private Keys in Frontend**: All signing via MetaMask.

> ⚠️ This is a reference implementation. Get an audit before mainnet deployment with real funds.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit: `git commit -m "Add amazing feature"`.
4. Push: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

---

## 📄 License

MIT License — see `LICENSE` file for details.

---

## 🙌 Acknowledgements

- [OpenZeppelin](https://openzeppelin.com/) for secure contract patterns.
- [ethers.js](https://docs.ethers.org/v6/) for blockchain interaction.
- [Hardhat](https://hardhat.org/) for development tooling.
- [TailwindCSS](https://tailwindcss.com/) for styling.

---

**Built with ❤️ for the decentralized security community.**

---

## 📊 Analytics Dashboard

A standalone page at `/analytics` shows platform totals for everyone, plus creator and contributor views for the connected wallet.

### Run
1. Backend: `cd backend && npm i && npm start`
2. Frontend: `cd frontend && npm run dev` (no new dependencies; charts are inline SVG)
3. Open `/analytics`.

### API
| Endpoint | Purpose |
| --- | --- |
| `GET /api/analytics/platform` | Platform totals, top earners, categories, 30-day submissions |
| `GET /api/analytics/creator/:wallet` | Creator funnel, time to first submission, time to claim, unclaimed rewards |
| `GET /api/analytics/contributor/:wallet` | Acceptance rate, total earned, earnings trend, wins by category |

Invalid wallets return 400. Creator responses are cached for 60 seconds per wallet.

### Metrics
| Metric | Computation |
| --- | --- |
| USDC distributed | Sum of `reward` on bounties with `distributedAt` set |
| Active / completed | Bounty status using the same rules as the `currentStatus` virtual |
| Top earners | Per-wallet sum of payouts on distributed bounties |
| Categories | Submissions grouped by their bounty's category |
| Submissions, 30 days | Daily `submittedAt` counts, zero-filled |
| Funnel | Enrollments, submissions, winners, with % of previous step |
| Time to first submission | Average of earliest `submittedAt` minus bounty `startDate` |
| Time to claim | Average of `RewardClaimed` block time minus `distributedAt` (read from the contract) |
| Unclaimed rewards | Distributed winners where contract `claimed(bountyId, winner)` is false |
| Acceptance rate | Accepted divided by total submissions for the wallet |
| Earnings trend | Cumulative payouts by `distributedAt` date |

### Payout rule
`winners.assigned` stores wallets only, so amounts are derived from `payoutType`: SINGLE pays the full reward; MULTI_EQUAL pays reward divided by winner count; MULTI_PERCENTAGE pays reward times `percentages[i]` divided by 100, matched by winner position.

### Assumptions
- Submission `user` is lowercase. Creator and winner matches are case-insensitive.
- "Distributed" means `distributedAt` is set.
- Submissions are counted from the Submission collection, because the Enrollment and Submission status enums differ.

### Limitations
- Views are not tracked, so the funnel starts at enrollment.
- Claim time and unclaimed rewards come from the contract. If the RPC is unreachable, those values show n/a instead of failing the page.
- Claim timing scans `RewardClaimed` logs from block zero; some RPC providers cap log ranges, in which case timing shows n/a.

### Suggested indexes
`Bounty { creator: 1 }`, `Bounty { distributedAt: 1 }`, `Submission { submittedAt: 1 }`, `Enrollment { bountyId: 1 }`.
