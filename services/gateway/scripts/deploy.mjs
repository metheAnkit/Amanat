import { config as loadEnv } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const gatewayDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = resolve(gatewayDir, "../..");
const contractsDir = resolve(rootDir, "contracts");
const chainsPath = resolve(rootDir, "shared", "chains.json");
loadEnv({ path: resolve(rootDir, ".env") });

const chainKey = process.argv[2];
const allowed = new Set(["anvil", "base-sepolia", "arbitrum-sepolia"]);
if (!allowed.has(chainKey)) throw new Error("Usage: npm run deploy -- <anvil|base-sepolia|arbitrum-sepolia>");

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required in .env`);
  return v;
};
const deployerKey = need("DEPLOYER_KEY");
const validatorKey = need("VALIDATOR_KEY");
const rpcUrl = process.env[`${chainKey.replaceAll("-", "_").toUpperCase()}_RPC_URL`] || need("RPC_URL");

const chains = JSON.parse(readFileSync(chainsPath, "utf8"));
const entry = Object.entries(chains).find(([, v]) => v.name === chainKey);
if (!entry) throw new Error(`No entry for "${chainKey}" in shared/chains.json`);
const [chainId, chainData] = entry;

if (!existsSync(resolve(contractsDir, "out"))) {
  execFileSync("forge", ["build"], { cwd: contractsDir, stdio: "inherit" });
}

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: contractsDir, encoding: "utf8" });

function create(contractPath, args = []) {
  const out = run("forge", [
    "create", contractPath,
    "--rpc-url", rpcUrl,
    "--private-key", deployerKey,
    "--broadcast",
    "--json",
    ...(args.length ? ["--constructor-args", ...args] : []),
  ]);
  const parsed = JSON.parse(out.trim());
  if (!parsed.deployedTo) throw new Error(`forge create did not return an address:\n${out}`);
  console.log(`  deployed ${contractPath.split(":").pop()} -> ${parsed.deployedTo}`);
  return parsed.deployedTo;
}

function walletAddress(privateKey) {
  return run("cast", ["wallet", "address", "--private-key", privateKey]).trim();
}

function sendTx(to, sig, args, privateKey) {
  run("cast", ["send", to, sig, ...args, "--rpc-url", rpcUrl, "--private-key", privateKey, "-q"]);
}

console.log(`Deploying to ${chainKey} (chain id ${chainId}) via ${rpcUrl}`);

let usdc = chainData.tokens?.usdc || "";
if (!usdc) {
  console.log("No USDC address set in shared/chains.json for this chain — deploying MockUSDC to test with.");
  usdc = create("src/mocks/MockUSDC.sol:MockUSDC");
} else {
  console.log(`Using existing USDC address from shared/chains.json: ${usdc}`);
}

const reputation = create("src/mocks/MockReputation.sol:MockReputation");

const validatorAddress = walletAddress(validatorKey);
const vault = create("src/MandateVault.sol:MandateVault", [usdc]);
const escrow = create("src/AmanatEscrow.sol:AmanatEscrow", [usdc, vault, validatorAddress, reputation]);

console.log("Wiring vault.setEscrow(escrow) ...");
sendTx(vault, "setEscrow(address)", [escrow], deployerKey);

chainData.tokens.usdc = usdc;
chainData.contracts.mandateVault = vault;
chainData.contracts.amanatEscrow = escrow;
chainData.contracts.reputationRegistry = reputation;
chainData.contracts.identityRegistry = "";
chains[chainId] = chainData;
writeFileSync(chainsPath, JSON.stringify(chains, null, 2) + "\n");

console.log(`\nDone. Addresses written to shared/chains.json under "${chainId}".`);
console.log(`Next: npm run bootstrap -- ${chainKey}`);