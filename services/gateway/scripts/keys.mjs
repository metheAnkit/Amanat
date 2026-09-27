import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const names = ["OWNER_KEY", "BUYER_AGENT_KEY", "VALIDATOR_KEY", "SELLER_ATMOS_KEY", "SELLER_FORGE_KEY", "SELLER_SHAKY_KEY", "SELLER_MERIDIAN_KEY"];
console.log("# Generated locally. Never commit this output or use these keys on a real network.");
for (const name of names) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log(`${name}=${privateKey}`);
  console.log(`# ${name.replace("_KEY", "_ADDRESS")}=${account.address}`);
}
