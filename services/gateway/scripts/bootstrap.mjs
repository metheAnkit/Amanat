import { config as loadEnv } from "dotenv";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const gatewayDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = resolve(gatewayDir, "../..");
const chainsPath = resolve(rootDir, "shared", "chains.json");
loadEnv({ path: resolve(rootDir, ".env") });

const chainKey = process.argv[2];
if (!chainKey) throw new Error("Usage: npm run bootstrap -- <anvil|base-sepolia|arbitrum-sepolia>");

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required in .env`);
  return v;
};
const deployerKey = need("DEPLOYER_KEY");
const ownerKey = need("OWNER_KEY");
const buyerAgentKey = need("BUYER_AGENT_KEY");
const sellerKeys = {
  atmos: need("SELLER_ATMOS_KEY"),
  forge: need("SELLER_FORGE_KEY"),
  shaky: need("SELLER_SHAKY_KEY"),
  meridian: need("SELLER_MERIDIAN_KEY"),
};
const rpcUrl = process.env[`${chainKey.replaceAll("-", "_").toUpperCase()}_RPC_URL`] || need("RPC_URL");
const depositUsdc = Number(process.env.DEMO_DEPOSIT_USDC || "5");

const chains = JSON.parse(readFileSync(chainsPath, "utf8"));
const entry = Object.entries(chains).find(([, v]) => v.name === chainKey);
if (!entry) throw new Error(`No entry for "${chainKey}" in shared/chains.json`);
const [chainId, chainData] = entry;
const { mandateVault, amanatEscrow } = chainData.contracts;
const usdc = chainData.tokens.usdc;
const missing = Object.entries({ mandateVault, amanatEscrow, usdc }).filter(([, v]) => !v);
if (missing.length) {
  throw new Error(`Missing ${missing.map(([k]) => k).join(", ")} for ${chainKey}. Run: npm run deploy -- ${chainKey}`);
}

const cast = (args) => execFileSync("cast", args, { encoding: "utf8" }).trim();
const castNet = (args) => execFileSync("cast", [...args, "--rpc-url", rpcUrl], { encoding: "utf8" }).trim();
const address = (privateKey) => cast(["wallet", "address", "--private-key", privateKey]);
const send = (to, sig, args, privateKey) => castNet(["send", to, sig, ...args, "--private-key", privateKey, "-q"]);
const usdcUnits = (n) => BigInt(Math.round(n * 1_000_000)); // USDC has 6 decimals

console.log(`Bootstrapping ${chainKey} (chain id ${chainId})`);
console.log(`  MandateVault  ${mandateVault}`);
console.log(`  AmanatEscrow  ${amanatEscrow}`);
console.log(`  USDC          ${usdc}`);

const ownerAddress = address(ownerKey);
const buyerAddress = address(buyerAgentKey);
const sellerAddresses = Object.fromEntries(Object.entries(sellerKeys).map(([name, key]) => [name, address(key)]));
console.log(`  Owner         ${ownerAddress}`);
console.log(`  Buyer agent   ${buyerAddress}`);
for (const [name, addr] of Object.entries(sellerAddresses)) console.log(`  Seller ${name.padEnd(9)} ${addr}`);

const amount = usdcUnits(depositUsdc);
try {
  console.log(`Minting ${depositUsdc} USDC to the owner (only works against MockUSDC)...`);
  send(usdc, "mint(address,uint256)", [ownerAddress, amount.toString()], deployerKey);
} catch {
  console.log("Mint failed or unsupported — assuming this is real USDC and the owner already holds test funds from faucet.circle.com.");
}

console.log("Approving the vault to pull USDC from the owner...");
send(usdc, "approve(address,uint256)", [mandateVault, amount.toString()], ownerKey);

const perTxCap = usdcUnits(0.1);
const dailyCap = usdcUnits(0.5);
const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
const sellerList = `[${Object.values(sellerAddresses).join(",")}]`;

console.log("Creating the demo mandate...");
send(
  mandateVault,
  "createMandate(address,uint256,uint256,uint256,address[])",
  [buyerAddress, perTxCap.toString(), dailyCap.toString(), String(expiresAt), sellerList],
  ownerKey
);
const mandateId = 1;

console.log(`Funding mandate #${mandateId} with ${depositUsdc} USDC...`);
send(mandateVault, "fund(uint256,uint256)", [String(mandateId), amount.toString()], ownerKey);

const agentsPath = resolve(rootDir, "deployments", `agents-${chainId}.json`);
execFileSync("mkdir", ["-p", resolve(rootDir, "deployments")]);
writeFileSync(
  agentsPath,
  JSON.stringify({ mandateId, owner: ownerAddress, buyerAgent: buyerAddress, sellers: sellerAddresses, validator: address(need("VALIDATOR_KEY")) }, null, 2) + "\n"
);

console.log(`\nDone. Mandate #${mandateId} is funded and ready. Details written to deployments/agents-${chainId}.json.`);