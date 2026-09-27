import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    dealId: { type: String, required: true, index: true },
    mandateId: String,
    seller: String,
    amount: String,
    status: String,
    validatorNotes: String,
    txHash: String
  },
  { timestamps: true }
);

const Receipt = mongoose.models.Receipt || mongoose.model("Receipt", receiptSchema);
const memoryReceipts = [];

export async function connectReceipts() {
  if (!process.env.MONGODB_URI || process.env.ALLOW_MEMORY_DB === "true") return;
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "Amanat" });
  await Receipt.createCollection();
  console.log(`MongoDB connected: ${mongoose.connection.name}.${Receipt.collection.name}`);
}

export async function listReceipts() {
  if (mongoose.connection.readyState === 1) return Receipt.find().sort({ createdAt: -1 }).lean();
  return [...memoryReceipts].reverse();
}

export async function saveReceipt(receipt) {
  if (mongoose.connection.readyState === 1) return Receipt.create(receipt);
  memoryReceipts.push({ ...receipt, createdAt: new Date().toISOString() });
  return receipt;
}
