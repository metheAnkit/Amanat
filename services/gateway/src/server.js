import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { connectReceipts, listReceipts, saveReceipt } from "./receipts.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(rootDir, ".env") });

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const sellers = [
  { id: "seller-atmos", name: "Atmos Labs", category: "Data API", reputation: 92, approved: true },
  { id: "seller-forge", name: "Forge AI", category: "Dev Tools", reputation: 88, approved: true },
  { id: "seller-shaky", name: "Shaky Translates", category: "Language", reputation: 61, approved: true },
  { id: "seller-meridian", name: "Meridian Data", category: "Data API", reputation: 79, approved: true }
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "gateway" }));
app.get("/api/sellers", (_req, res) => res.json({ sellers }));
app.get("/api/receipts", async (_req, res, next) => {
  try { res.json({ receipts: await listReceipts() }); } catch (error) { next(error); }
});

app.get("/pay/:sellerId", (req, res) => {
  const seller = sellers.find((item) => item.id === req.params.sellerId);
  if (!seller) return res.status(404).json({ error: "seller_not_found" });
  res.status(402).json({
    scheme: "amanat-escrow",
    network: process.env.ACTIVE_CHAIN || "anvil",
    seller: seller.id,
    amount: req.query.amount || "0.80",
    asset: "USDC",
    challengeWindowSeconds: 60,
    paymentEndpoint: `/pay/${seller.id}`
  });
});

app.post("/api/receipts", async (req, res, next) => {
  try {
    const receipt = await saveReceipt(req.body);
    res.status(201).json({ receipt });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "gateway_error" });
});

connectReceipts()
  .then(() => app.listen(port, () => console.log(`Amanat gateway listening on :${port}`)))
  .catch((error) => { console.error(error); process.exit(1); });
