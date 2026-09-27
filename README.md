<div align="center">

# Amanat

**Mandate · Escrow · Validate**

An accountability layer for AI-agent spending – so users can delegate real money without trusting the agent with their keys.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-08d29d)](LICENSE)

[Live Demo](#live-demo) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Deployment](#deployment)

</div>

---

## The Problem

Protocols like **x402** let agents pay APIs autonomously. **ERC-8004** gives them on-chain identity. NPCI is preparing to let them transact on UPI. But when a seller returns garbage – or the agent itself misbehaves – **there is no recourse**. Without recourse, users will not delegate real money.

## How Amanat Solves It

Amanat sits between a user, their AI agent, and every service the agent pays:

```
User ──► MandateVault ──► Agent ──► Escrow ──► Validator ──► Settle
          (caps & rules)           (holds funds)  (re-executes)  (release / refund)
```

1. **Mandate** – The user funds a vault with per-transaction and daily caps, an approved-seller whitelist, and an expiry. The agent can never exceed these limits.
2. **Escrow** – Every payment is held in escrow with a challenge window before release.
3. **Validation** – An independent validator re-executes or evaluates the seller's output. Bad work triggers an automatic refund.
4. **Reputation** – ERC-8004 reputation scores update on every validation outcome, creating a portable trust signal for the agent economy.

---

## Architecture

```
amanat/
├── contracts/              # Solidity smart contracts (Foundry)
│   └── src/
│       ├── MandateVault.sol      # Per-tx cap, daily cap, approved sellers, expiry
│       └── AmanatEscrow.sol      # Challenge-window escrow with validator resolution
├── services/
│   ├── gateway/            # Node.js + Express – x402 paywall, receipts API, MongoDB
│   │   ├── src/server.js
│   │   ├── src/receipts.js
│   │   └── scripts/              # deploy.mjs, bootstrap.mjs, keys.mjs
│   └── agent/              # Python + FastAPI – buyer agent & validator logic
│       └── app/
│           ├── main.py
│           └── validator.py      # Pure, deterministic, pytestable
├── frontend/               # React + Vite + Three.js dashboard
├── shared/                 # Chain config (chains.json) and ABIs
├── render.yaml             # Render deployment blueprint (3 services)
└── scripts/local-demo.sh   # One-command local dev startup
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contracts** | Solidity 0.8.28 · Foundry | `MandateVault` enforces spending rules; `AmanatEscrow` holds funds until validator verdict |
| **Gateway** | Node.js · Express · MongoDB | x402-style payment routing, receipt storage, seller registry |
| **Agent / Validator** | Python · FastAPI | Buyer agent boundary + independent work validation |
| **Dashboard** | React 19 · Vite · Three.js | Live mandate tracking, transaction receipts, reputation scores, escrow flow visualization |
| **Chains** | Base Sepolia · Arbitrum Sepolia | Multichain testnet deployment with Circle USDC |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.11
- **Foundry** (install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- **MongoDB** (optional for local dev – set `ALLOW_MEMORY_DB=true`)

### One-command launch (WSL / Linux / macOS)

```bash
git clone https://github.com/your-org/amanat.git
cd amanat
cp .env.example .env
bash scripts/local-demo.sh
```

This starts **Anvil** (local chain), the **gateway**, the **agent**, and the **dashboard** together. Open [http://localhost:5173](http://localhost:5173).

### Manual startup (Windows / step-by-step)

```bash
# 1. Install dependencies
cd services/gateway && npm install && cd ../..
cd frontend && npm install && cd ..
pip install -r services/agent/requirements.txt

# 2. Start each service
npm --prefix services/gateway run dev          # Gateway  → :4000
python -m uvicorn app.main:app --app-dir services/agent --port 8000  # Agent → :8000
npm --prefix frontend run dev                  # Dashboard → :5173
```

---

## Live Demo

The dashboard includes an interactive demo that simulates the full escrow lifecycle:

| Step | Seller | Amount | Outcome |
|------|--------|--------|---------|
| 1 | Atmos Labs | 0.80 USDC | ✅ Validator pass → released |
| 2 | Forge AI | 1.20 USDC | ✅ Validator pass → released |
| 3 | Shaky Translates | 0.50 USDC | ❌ Validator fail → refunded |
| 4 | Meridian Data | 3.50 USDC | ⛔ Per-tx cap exceeded → reverted |

Click **"Run live demo"** to watch the mandate balance, receipts, reputation scores, and escrow flow update in real time.

---

## Deployment

### Testnet deployment (Base Sepolia / Arbitrum Sepolia)

```bash
# 1. Generate wallet keys
cd services/gateway && npm run keys
# Copy the output into .env – never commit private keys

# 2. Fund wallets
#    - Owner + deployer: testnet ETH from faucet
#    - Owner: testnet USDC from faucet.circle.com

# 3. Deploy contracts
npm run deploy -- base-sepolia
npm run deploy -- arbitrum-sepolia

# 4. Bootstrap the demo mandate
npm run bootstrap -- base-sepolia
npm run bootstrap -- arbitrum-sepolia
```

### Render (production)

The included `render.yaml` deploys three services:

| Service | Type | Runtime |
|---------|------|---------|
| `amanat-gateway` | Web service | Node.js |
| `amanat-agent` | Web service | Python |
| `amanat-dashboard` | Static site | Vite build |

```bash
# Apply the blueprint
# Render Dashboard → New → Blueprint → connect this repo
```

Set these **secrets** in Render's dashboard (marked `sync: false` in the YAML):
- `MONGODB_URI` – your Atlas connection string
- `INTERNAL_API_KEY` – shared key between gateway and agent
- `SELLER_*_KEY` – four seller wallet private keys
- `VALIDATOR_KEY`, `BUYER_AGENT_KEY` – agent wallet keys

### USDC Contract Addresses

| Chain | Chain ID | USDC (Circle official) |
|-------|----------|----------------------|
| Base Sepolia | `84532` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Arbitrum Sepolia | `421614` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

> Addresses verified against [Circle's developer documentation](https://developers.circle.com/). Always cross-check before deploying.

---

## Smart Contracts

### MandateVault

The owner creates a mandate with:
- **Per-transaction cap** – maximum USDC per single payment
- **Daily cap** – rolling 24h spending limit
- **Approved sellers** – whitelist of addresses the agent can pay
- **Expiry** – mandate auto-expires after the set timestamp

Only the designated **agent address** can call `authorizePayment`. Funds move directly into the escrow contract.

### AmanatEscrow

Each payment creates a **deal** with a challenge window. After the window closes, the **validator** calls `resolve()`:
- **Pass** → USDC released to the seller, `+1` reputation
- **Fail** → USDC refunded to the mandate vault, `-1` reputation

Both contracts use reentrancy guards and checked transfers.

---

## API Reference

### Gateway (`services/gateway` – port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/sellers` | List approved sellers |
| `GET` | `/api/receipts` | List transaction receipts |
| `POST` | `/api/receipts` | Store a new receipt |
| `GET` | `/pay/:sellerId` | x402-style payment challenge (returns 402) |

### Agent (`services/agent` – port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/validate` | Validate delivered work against spec |
| `POST` | `/run-demo` | Trigger the demo scenario |

---

## Environment Variables

See [`.env.example`](.env.example) for the full template. Key variables:

| Variable | Purpose |
|----------|---------|
| `ACTIVE_CHAIN` | Primary chain (`anvil`, `base-sepolia`, `arbitrum-sepolia`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ALLOW_MEMORY_DB` | `true` for local dev without MongoDB |
| `DEPLOYER_KEY` | Wallet key for contract deployment |
| `OWNER_KEY` | Mandate owner wallet key |
| `BUYER_AGENT_KEY` | AI agent wallet key |
| `VALIDATOR_KEY` | Validator wallet key |
| `VITE_API_URL` | Gateway URL for the frontend (build-time) |

---

## Security Notes

- **Never commit `.env`** – it is gitignored. Use `.env.example` as a template.
- **Contracts are unaudited** – this is a hackathon demo, not production software.
- **Rotate any leaked credentials** immediately, including MongoDB passwords.
- **Use only testnet funds** – do not deposit real assets into unaudited contracts.

---

## Testing

```bash
# Smart contract tests (requires Foundry)
cd contracts && forge test

# Validator unit tests
python -m pytest services/agent/tests

# Gateway health check
curl http://localhost:4000/health
```

---

## 📄 License

Copyright © 2026 Ankit and Amanat contributors. All rights reserved.

---

<div align="center">

**Amanat** – Give your AI agent a budget, not your wallet.

</div>
