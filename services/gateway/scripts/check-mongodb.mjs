import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(rootDir, ".env") });

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from the root .env");
if (process.env.ALLOW_MEMORY_DB === "true") throw new Error("ALLOW_MEMORY_DB must be false for MongoDB verification");

const schema = new mongoose.Schema({}, { strict: false });
const Receipt = mongoose.models.Receipt || mongoose.model("Receipt", schema, "receipts");

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || "Amanat",
    serverSelectionTimeoutMS: 8000,
  });
  await Receipt.createCollection();
  console.log(JSON.stringify({
    connected: true,
    database: mongoose.connection.name,
    collection: Receipt.collection.name,
  }));
} catch (error) {
  console.error(JSON.stringify({ connected: false, error: error.message }));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
