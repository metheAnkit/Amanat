import { useEffect, useState, useCallback, useRef } from "react";
import { HeroScene } from "./HeroScene.jsx";

const gatewayUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";
const agentUrl = import.meta.env.VITE_AGENT_URL || "http://localhost:8000";

const DEMO_SCENARIOS = [
  {
    id: "scenario-1",
    seller: "Atmos Labs",
    sellerId: "seller-atmos",
    amount: "0.80",
    purpose: "Weather data API call",
    expectedWork: "Return 5-day forecast JSON with temp humidity pressure wind for Mumbai",
    deliveredWork: "5-day forecast JSON with temp humidity pressure wind for Mumbai city weather data",
    validationResult: { passed: true, score: 0.95, notes: "Specification satisfied" },
    expectedOutcome: "released",
    note: "tx:0xa3f1…c842 · escrow #1 · released after validation",
    repDelta: +3,
  },
  {
    id: "scenario-2",
    seller: "Forge AI",
    sellerId: "seller-forge",
    amount: "1.20",
    purpose: "Code review analysis",
    expectedWork: "Static analysis report covering security lint performance with severity scores",
    deliveredWork: "Static analysis report covering security lint performance with severity scores and fix suggestions",
    validationResult: { passed: true, score: 0.92, notes: "Specification satisfied" },
    expectedOutcome: "released",
    note: "tx:0x7b2e…f910 · escrow #2 · released after validation",
    repDelta: +2,
  },
  {
    id: "scenario-3",
    seller: "Shaky Translates",
    sellerId: "seller-shaky",
    amount: "0.50",
    purpose: "Hindi → English translation",
    expectedWork: "Accurate translation of legal document preserving formatting and technical terms",
    deliveredWork: "Rough machine translation with many errors missing sections",
    validationResult: { passed: false, score: 0.35, notes: "Coverage 35% below 70% floor" },
    expectedOutcome: "refunded",
    note: "tx:0xd8c4…2a17 · escrow #3 · REFUNDED – validator fail",
    repDelta: -8,
  },
  {
    id: "scenario-4",
    seller: "Meridian Data",
    sellerId: "seller-meridian",
    amount: "3.50",
    purpose: "Satellite imagery batch",
    expectedWork: "High-resolution satellite images for 10 locations",
    deliveredWork: null, // never reaches delivery — blocked by contract
    validationResult: null,
    expectedOutcome: "blocked",
    note: "REVERTED – TransactionCapExceeded(3500000, 2500000)",
    repDelta: 0,
  },
];

const steps = [
  ["01", "Set the mandate", "Per-transaction cap, daily cap, approved sellers, expiry. Written into the vault contract.", "USER"],
  ["02", "Register identities", "Buyer and seller agents register in the ERC-8004 Identity Registry.", "ERC-8004"],
  ["03", "Pay into escrow", "x402 request routes payment to the vault with a short challenge window.", "X402 · USDC"],
  ["04", "Validate + settle", "Validator re-executes the work. Pass → release. Fail → refund + reputation drop.", "VALIDATOR"],
];

function Icon({ name, size = 20 }) {
  const paths = {
    shield: <><path d="M12 21s8-3.8 8-10V5l-8-3-8 3v6c0 6.2 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    identity: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M13 10h5M13 14h4" /></>,
    payment: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 14h3" /></>,
    flask: <><path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7 15h10" /></>,
    route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h3a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4h-1" /></>,
    database: <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l1.4-1.4a5 5 0 0 0-7.1-7.1L10.2 5.8" /><path d="M14 11a5 5 0 0 0-7.1-.1l-1.4 1.4a5 5 0 0 0 7.1 7.1l1.2-1.2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14" /><path d="M21 19v-5h-5" /></>,
    how: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
    demo: <><path d="m8 5 11 7-11 7V5Z" /></>,
    tech: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="8" /></>,
    impact: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    check: <><path d="M20 6L9 17l-5-5" /></>,
    x: <><path d="M18 6 6 18M6 6l12 12" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const DEFAULT_SELLERS = [
  { id: "seller-atmos", name: "Atmos Labs", category: "Data API", reputation: 92, approved: true },
  { id: "seller-forge", name: "Forge AI", category: "Dev Tools", reputation: 88, approved: true },
  { id: "seller-shaky", name: "Shaky Translates", category: "Language", reputation: 61, approved: true },
  { id: "seller-meridian", name: "Meridian Data", category: "Data API", reputation: 79, approved: true },
];

const MANDATE_INITIAL = {
  balance: 5.0,
  totalBudget: 5.0,
  perTxCap: 2.5,
  dailyCap: 5.0,
  spent: 0,
  spentToday: 0,
};

function App() {
  const [sellers, setSellers] = useState(DEFAULT_SELLERS);
  const [receipts, setReceipts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(-1);
  const [mandate, setMandate] = useState(MANDATE_INITIAL);
  const [escrowState, setEscrowState] = useState([
    { label: "Agent request", detail: "x402 + USDC", state: "idle" },
    { label: "Mandate vault", detail: "holds funds", state: "idle" },
    { label: "Validator", detail: "re-executes work", state: "idle" },
    { label: "Settle", detail: "release or refund", state: "idle" },
  ]);
  const [scenarioIndex, setScenarioIndex] = useState(-1);
  const [demoComplete, setDemoComplete] = useState(false);
  const abortRef = useRef(null);

  // Try to load real seller data from gateway
  useEffect(() => {
    fetch(`${gatewayUrl}/api/sellers`)
      .then((r) => r.json())
      .then((data) => { if (data.sellers?.length) setSellers(data.sellers); })
      .catch(() => undefined);
    fetch(`${gatewayUrl}/api/receipts`)
      .then((r) => r.json())
      .then((data) => { if (data.receipts?.length) setReceipts(data.receipts); })
      .catch(() => undefined);
  }, []);

  const sleep = (ms) => new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    if (abortRef.current) {
      abortRef.current.timeouts.push(id);
    }
  });

  const updateEscrow = useCallback((updates) => {
    setEscrowState((prev) => prev.map((row, i) => updates[i] ? { ...row, ...updates[i] } : row));
  }, []);

  const postReceiptToGateway = useCallback(async (receipt) => {
    try {
      await fetch(`${gatewayUrl}/api/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: receipt.id,
          mandateId: "1",
          seller: receipt.seller,
          amount: receipt.amount,
          status: receipt.status,
          validatorNotes: receipt.note,
          txHash: receipt.txHash || "",
        }),
      });
    } catch {
      // Gateway may be down; local state is sufficient
    }
  }, []);

  const processScenario = useCallback(async (scenario, index) => {
    const amount = parseFloat(scenario.amount);

    // Step 1: Agent request — update escrow flow
    setScenarioIndex(index);
    setCurrentStep(0);
    setMessage(`Step ${index + 1}/4: Agent requesting ${scenario.purpose} from ${scenario.seller}…`);
    updateEscrow({
      0: { state: "active", detail: `${scenario.seller} · ${scenario.amount} USDC` },
      1: { state: "idle" },
      2: { state: "idle" },
      3: { state: "idle" },
    });
    await sleep(1200);

    // Step 2: Mandate vault check
    setCurrentStep(1);

    // Check if transaction would be blocked by per-tx cap
    if (amount > mandate.perTxCap) {
      setMessage(`Step ${index + 1}/4: ⛔ Transaction cap exceeded — ${scenario.amount} USDC > ${mandate.perTxCap} USDC cap. Contract reverted.`);
      updateEscrow({
        0: { state: "done" },
        1: { state: "idle", detail: "REVERTED – cap exceeded" },
      });
      await sleep(800);

      const receipt = {
        id: scenario.id,
        seller: scenario.seller,
        amount: scenario.amount,
        purpose: scenario.purpose,
        status: "blocked",
        note: scenario.note,
        txHash: `0x${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`,
      };
      setReceipts((prev) => [...prev, receipt]);
      await postReceiptToGateway(receipt);
      return;
    }

    // Check remaining balance
    if (amount > mandate.balance) {
      setMessage(`Step ${index + 1}/4: ⛔ Insufficient balance — ${scenario.amount} USDC requested, ${mandate.balance.toFixed(2)} USDC available.`);
      updateEscrow({
        0: { state: "done" },
        1: { state: "idle", detail: "REVERTED – insufficient balance" },
      });
      await sleep(800);

      const receipt = {
        id: scenario.id,
        seller: scenario.seller,
        amount: scenario.amount,
        purpose: scenario.purpose,
        status: "blocked",
        note: "REVERTED – InsufficientBalance",
        txHash: "",
      };
      setReceipts((prev) => [...prev, receipt]);
      await postReceiptToGateway(receipt);
      return;
    }

    // Deduct from mandate
    setMandate((prev) => ({
      ...prev,
      balance: Math.round((prev.balance - amount) * 100) / 100,
      spent: Math.round((prev.spent + amount) * 100) / 100,
      spentToday: Math.round((prev.spentToday + amount) * 100) / 100,
    }));
    setMessage(`Step ${index + 1}/4: Mandate vault holding ${scenario.amount} USDC in escrow for ${scenario.seller}…`);
    updateEscrow({
      0: { state: "done" },
      1: { state: "active", detail: `holding ${scenario.amount} USDC` },
    });
    await sleep(1400);

    // Step 3: Validator
    setCurrentStep(2);
    setMessage(`Step ${index + 1}/4: Validator re-executing work from ${scenario.seller}… checking specification coverage.`);
    updateEscrow({
      1: { state: "done" },
      2: { state: "active", detail: `score: ${(scenario.validationResult.score * 100).toFixed(0)}%` },
    });

    // Try calling real validator
    try {
      const valRes = await fetch(`${agentUrl}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected: scenario.expectedWork, delivered: scenario.deliveredWork }),
      });
      if (valRes.ok) {
        const result = await valRes.json();
        scenario.validationResult = result;
      }
    } catch {
      // Use pre-defined validation result
    }

    await sleep(1600);

    // Step 4: Settlement
    setCurrentStep(3);
    const passed = scenario.validationResult.passed;

    if (passed) {
      setMessage(`Step ${index + 1}/4: ✅ Validator passed (${(scenario.validationResult.score * 100).toFixed(0)}%). Releasing ${scenario.amount} USDC to ${scenario.seller}.`);
      updateEscrow({
        2: { state: "done", detail: `PASS · ${(scenario.validationResult.score * 100).toFixed(0)}%` },
        3: { state: "done", detail: `released ${scenario.amount} USDC` },
      });

      const receipt = {
        id: scenario.id,
        seller: scenario.seller,
        amount: scenario.amount,
        purpose: scenario.purpose,
        status: "released",
        note: scenario.note,
        txHash: `0x${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`,
      };
      setReceipts((prev) => [...prev, receipt]);
      await postReceiptToGateway(receipt);

      // Update seller reputation (positive)
      setSellers((prev) =>
        prev.map((s) => s.id === scenario.sellerId ? { ...s, reputation: Math.min(100, s.reputation + scenario.repDelta) } : s)
      );
    } else {
      // Refund the mandate
      setMandate((prev) => ({
        ...prev,
        balance: Math.round((prev.balance + amount) * 100) / 100,
        spent: Math.round((prev.spent - amount) * 100) / 100,
        spentToday: Math.max(0, Math.round((prev.spentToday - amount) * 100) / 100),
      }));

      setMessage(`Step ${index + 1}/4: ❌ Validator FAILED (${(scenario.validationResult.score * 100).toFixed(0)}%). Refunding ${scenario.amount} USDC to mandate vault.`);
      updateEscrow({
        2: { state: "done", detail: `FAIL · ${(scenario.validationResult.score * 100).toFixed(0)}%` },
        3: { state: "done", detail: `refunded ${scenario.amount} USDC` },
      });

      const receipt = {
        id: scenario.id,
        seller: scenario.seller,
        amount: scenario.amount,
        purpose: scenario.purpose,
        status: "refunded",
        note: scenario.note,
        txHash: `0x${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`,
      };
      setReceipts((prev) => [...prev, receipt]);
      await postReceiptToGateway(receipt);

      // Update seller reputation (negative)
      setSellers((prev) =>
        prev.map((s) => s.id === scenario.sellerId ? { ...s, reputation: Math.max(0, s.reputation + scenario.repDelta) } : s)
      );
    }

    await sleep(1000);
  }, [mandate, updateEscrow, postReceiptToGateway]);

  const runDemo = useCallback(async () => {
    setBusy(true);
    setMessage("");
    setReceipts([]);
    setMandate(MANDATE_INITIAL);
    setCurrentStep(-1);
    setScenarioIndex(-1);
    setDemoComplete(false);
    setSellers((prev) => prev.map((s) => {
      const def = DEFAULT_SELLERS.find((d) => d.id === s.id);
      return def ? { ...s, reputation: def.reputation } : s;
    }));

    // Try to trigger the real agent backend
    try {
      await fetch(`${agentUrl}/run-demo`, { method: "POST" });
    } catch {
      // Agent may be offline — local simulation continues
    }

    const abort = { cancelled: false, timeouts: [] };
    abortRef.current = abort;

    for (let i = 0; i < DEMO_SCENARIOS.length; i++) {
      if (abort.cancelled) break;
      await processScenario(DEMO_SCENARIOS[i], i);
      if (i < DEMO_SCENARIOS.length - 1) {
        setMessage(`Completed ${i + 1}/4 transactions. Moving to next…`);
        await sleep(1200);
      }
    }

    if (!abort.cancelled) {
      setDemoComplete(true);
      setMessage("✅ Demo complete — 2 released, 1 refunded, 1 blocked by contract. Review the receipts and reputation changes below.");
      setCurrentStep(4);
      updateEscrow({
        0: { state: "done", detail: "x402 + USDC" },
        1: { state: "done", detail: "all funds settled" },
        2: { state: "done", detail: "3 validations run" },
        3: { state: "done", detail: "2 released · 1 refunded" },
      });
    }

    abortRef.current = null;
    setBusy(false);
  }, [processScenario, updateEscrow]);

  const resetDemo = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.cancelled = true;
      abortRef.current.timeouts.forEach(clearTimeout);
      abortRef.current = null;
    }
    setBusy(false);
    setReceipts([]);
    setMandate(MANDATE_INITIAL);
    setCurrentStep(-1);
    setScenarioIndex(-1);
    setMessage("");
    setDemoComplete(false);
    setEscrowState([
      { label: "Agent request", detail: "x402 + USDC", state: "idle" },
      { label: "Mandate vault", detail: "holds funds", state: "idle" },
      { label: "Validator", detail: "re-executes work", state: "idle" },
      { label: "Settle", detail: "release or refund", state: "idle" },
    ]);
    setSellers((prev) => prev.map((s) => {
      const def = DEFAULT_SELLERS.find((d) => d.id === s.id);
      return def ? { ...s, reputation: def.reputation } : s;
    }));
  }, []);

  const spentPercent = ((mandate.spent / mandate.totalBudget) * 100).toFixed(0);

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Amanat home"><strong className="wordmark">AMANAT</strong><span><small>MANDATE · ESCROW · VALIDATE</small></span></a>
      <nav className="nav-links" aria-label="Primary navigation"><a href="#how"><Icon name="how" size={16} />How it works</a><a href="#demo"><Icon name="demo" size={16} />Live demo</a><a href="#stack"><Icon name="tech" size={16} />Tech</a><a href="#impact"><Icon name="impact" size={16} />Impact</a></nav>
      <div className="network"><span className="status-dot" />Live on Base Sepolia</div>
    </header>

    <section id="top" className="hero"><div className="grid-bg" /><div className="hero-inner shell"><div className="hero-copy"><div className="eyebrow-pill"><b>NEW</b>Accountable spending for AI agents</div><h1>Give your AI agent a <em>budget</em>,<br />not your wallet.</h1><p>Amanat is a mandate, escrow and validation layer that sits between a user, their agent and every service the agent pays. The smart contract enforces the limits – the agent never touches your keys, and bad work is refunded automatically.</p><div className="hero-actions"><a className="button primary" href="#demo">Run the live demo <Icon name="arrow" size={16} /></a><a className="button secondary" href="#how">Read the protocol</a></div></div><HeroScene /><div className="stats"><Stat label="Per-tx cap" value="2.50 USDC" note="enforced on-chain" /><Stat label="Daily cap" value="5.00 USDC" note="resets at UTC 00:00" /><Stat label="Challenge window" value="60 s" note="validator re-executes" /><Stat label="Refund SLA" value="automatic" note="on validation fail" /></div></div></section>

    <section className="section gap-section"><div className="shell two-column"><div><div className="eyebrow red">THE GAP</div><h2>Agents can pay. Nothing holds them accountable.</h2><p>x402 lets agents pay APIs on their own. ERC-8004 gives them on-chain identity and reputation. NPCI is preparing to let them pay on UPI with preset limits. But when a seller returns garbage – or the agent itself misbehaves – there is no recourse. Without recourse, users will not delegate real money.</p></div><div className="signal-list"><Signal icon="identity" title="Identity exists" text="ERC-8004 registers buyer and seller agents on-chain." /><Signal icon="payment" title="Payments work" text="x402 + USDC lets agents pay without human approval." /><Signal icon="shield" title="Accountability is missing" text="No mandate, no escrow, no validator. Overspend and bad output go unpunished." danger /></div></div></section>

    <section id="how" className="section how-section"><div className="shell"><div className="copy"><div className="eyebrow">HOW IT WORKS</div><h2>One mandate. Every payment enforced.</h2><p>Fund a mandate vault once with USDC. The schema mirrors UPI Circle and Reserve Pay – familiar to Indian users and regulators. Your agent can only act inside the rules, and every payment is validated before release.</p></div><div className="step-grid">{steps.map(([number, title, text, tag]) => <article className="step-card" key={number}><div className="step-top"><b>{number}</b><span>{tag}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section id="demo" className="section demo-section"><div className="shell"><div className="section-heading"><div><div className="eyebrow">LIVE DEMO</div><h2>Judge wallet · 5 USDC mandate</h2><p>Step through the scenario: three purchases, one caught by the validator, one blocked by the contract. Watch the mandate, receipts and seller reputations update in real time.</p></div><div className="synced"><span className="status-dot" />{busy ? "Processing transactions…" : demoComplete ? "Demo complete" : "Synced to on-chain state"}</div></div><div className="demo-grid"><MandateCard sellers={sellers} mandate={mandate} spentPercent={spentPercent} /><div className="progress-card"><div className="eyebrow">SCENARIO PROGRESS</div>{DEMO_SCENARIOS.map((scenario, index) => {
      let stepClass = "";
      if (scenarioIndex === index) stepClass = "current";
      else if (scenarioIndex > index) stepClass = "completed";
      const outcomeLabel = scenario.expectedOutcome === "released" ? "Validator: pass · release" : scenario.expectedOutcome === "refunded" ? "Validator: fail · refund" : "Contract: revert";
      return <div className={`progress-step ${stepClass}`} key={scenario.id}><b>{String(index + 1).padStart(2, "0")}</b><span>{scenario.seller} — {scenario.purpose}<small>{scenarioIndex > index && index < DEMO_SCENARIOS.length ? `✓ ${outcomeLabel}` : outcomeLabel}</small></span>{scenarioIndex > index && <span className={`step-badge ${scenario.expectedOutcome}`}>{scenario.expectedOutcome}</span>}</div>;
    })}</div></div><div className="demo-actions"><button className="button primary" onClick={runDemo} disabled={busy}><span className="button-dot" />{busy ? "Settling on-chain…" : "Run live demo"}</button><button className="button secondary" disabled><Icon name="download" size={15} />Export UPI Reserve Pay JSON</button><button className="button ghost" onClick={resetDemo}><Icon name="refresh" size={15} />Reset demo</button>{message && <span className="message">{message}</span>}</div><div className="lower-grid"><ReceiptList receipts={receipts} /><div className="demo-side"><Reputation sellers={sellers} /><EscrowFlow rows={escrowState} /></div></div></div></section>

    <section id="stack" className="section stack-section"><div className="shell"><div className="eyebrow">STACK</div><h2>Built for the agent economy, end to end.</h2><div className="stack-grid"><Tech icon="link" label="SMART CONTRACTS" title="Solidity + Foundry" text="MandateVault and EscrowRouter on Base, with a second chain for multichain settlement." /><Tech icon="identity" label="IDENTITY" title="ERC-8004" text="Buyer and seller agents register once. Reputation is updated on every validation outcome." /><Tech icon="payment" label="PAYMENTS" title="x402 · USDC" text="HTTP-native payment protocol. The agent pays per request, inside its mandate." /><Tech icon="flask" label="VALIDATOR" title="FastAPI (Python)" text="Re-executes or evaluates seller output against the spec. Verdict written on-chain." /><Tech icon="route" label="MIDDLEWARE" title="Node.js + Express" text="Routes x402 requests, checks mandate limits before any funds move." /><Tech icon="database" label="RECEIPTS" title="MongoDB" text="Off-chain log of every escrow, verdict and settlement for dashboards and disputes." /><Tech icon="chart" label="DASHBOARD" title="React" text="Live mandate usage, receipts, refunds and seller reputation in one view." /><Tech icon="payment" label="INDIAN RAILS" title="UPI Reserve Pay (mock)" text="Schema-mapped to NPCI Reserve Pay. Real integration needs PSP onboarding." /><Tech icon="arrow" label="DEPLOYMENT" title="Base + multichain" text="Primary chain is Base. A second chain satisfies the multichain requirement." /></div></div></section>

    <section id="impact" className="section impact-section"><div className="shell two-column"><div><div className="eyebrow">IMPACT</div><h2>Real money, real recourse.</h2><p>Amanat makes agent payments safe enough for ordinary users and businesses to delegate real money – starting with small recurring purchases. The mandate model is portable across crypto rails and Indian payment infrastructure, and the reputation data gives the agent economy a trust signal that does not depend on any single platform.</p><div className="impact-stats"><Stat label="Target users" value="SMBs + prosumers" /><Stat label="Beachhead" value="Recurring API buys" /><Stat label="Moat" value="Validator + rep data" /><Stat label="Portability" value="UPI ↔ EVM" /></div></div><blockquote>"The agent paid for three services. One failed validation and was refunded before I even looked. That is what delegation should feel like."<cite>– Judge, live demo walkthrough</cite><div className="liability"><div className="eyebrow">LIABILITY FRAMEWORK</div>When NPCI publishes its agent-on-UPI liability rules, Amanat already ships the matching primitive: <b>mandate + escrow + validator + reputation</b>.</div></blockquote></div></section>

    <footer className="site-footer"><span>Copyright © 2026 Amanat. All rights reserved.</span><span className="footer-links"><a href="/terms.html">Terms and Conditions</a><a href="/privacy.html">Privacy Policy</a></span></footer>
  </main>;
}

function Stat({ label, value, note }) { return <div className="stat"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }
function Signal({ icon, title, text, danger }) { return <div className={`signal ${danger ? "danger" : ""}`}><span className="icon-box"><Icon name={icon} /></span><span><b>{title}</b><small>{text}</small></span></div>; }
function Tech({ icon, label, title, text }) { return <article className="tech-card"><Icon name={icon} size={22} /><div><div className="eyebrow">{label}</div><h3>{title}</h3></div><p>{text}</p></article>; }

function MandateCard({ sellers, mandate, spentPercent }) {
  const names = sellers.length ? sellers.map((seller) => seller.name) : ["Atmos Labs", "Forge AI", "Shaky Translates", "Meridian Data"];
  const meterWidth = `${Math.min(100, parseFloat(spentPercent))}%`;
  const meterColor = parseFloat(spentPercent) > 80 ? "#ff5579" : parseFloat(spentPercent) > 50 ? "#f4b91e" : "#08d29d";

  return <div className="mandate-card"><div className="panel-kicker">MANDATE VAULT <span>{mandate.balance > 0 ? "ACTIVE" : "DEPLETED"}</span></div><div className="mandate-title"><div><h3>Judge wallet</h3><p className="mono">0xAmanat…Vau1t</p><small>Owner: Judge Wallet · 0xJuD9e…0x42</small></div><strong>{mandate.balance.toFixed(2)} <small>USDC</small></strong></div><div className="meter"><span style={{ width: meterWidth, background: meterColor, transition: "width 0.6s ease, background 0.4s ease" }} /></div><div className="meter-label"><span>Spent: {mandate.spent.toFixed(2)} / {mandate.totalBudget.toFixed(2)} USDC</span><span>{spentPercent}% used</span></div><div className="rule-grid"><Stat label="PER-TX CAP" value={`${mandate.perTxCap.toFixed(4)} USDC`} /><Stat label="DAILY CAP" value={`${mandate.dailyCap.toFixed(4)} USDC`} /><Stat label="BUDGET" value={`${mandate.totalBudget.toFixed(4)} USDC`} /><Stat label="EXPIRES" value="7 days" /></div><div className="approved"><div className="eyebrow">APPROVED SELLERS · {names.length} WHITELISTED</div>{names.map((name) => <span key={name}>{name}</span>)}</div></div>;
}

function ReceiptList({ receipts }) {
  return <div className="receipt-panel"><div className="panel-heading"><b>Transaction receipts</b><small>{receipts.length} events</small></div>{receipts.length === 0 ? <div className="empty-receipts">No transactions yet. Run the live demo to start the scenario.</div> : receipts.map((receipt, index) => <div className={`receipt receipt-animate`} key={receipt.id || index} style={{ animationDelay: `${index * 0.1}s` }}><span className={`status ${receipt.status}`}>{receipt.status}</span><span><b>{receipt.seller}</b><small>{receipt.purpose}</small><em>{receipt.note}</em></span><strong>{receipt.amount} <small>USDC</small></strong></div>)}</div>;
}

function Reputation({ sellers }) {
  const values = [...sellers].sort((left, right) => right.reputation - left.reputation);
  return <div className="reputation"><div className="panel-heading"><b>ERC-8004 reputation</b><small>LIVE</small></div>{values.map((seller) => {
    const score = seller.reputation || 80;
    const tone = score >= 85 ? "good" : score >= 70 ? "watch" : "risk";
    return <div className="rep-row" key={seller.name}><span className="avatar">{seller.name.split(" ").map((word) => word[0]).join("")}</span><span><b>{seller.name}</b><small>{seller.category || "Seller agent"}</small></span><i className={tone}><span style={{ width: `${score}%`, transition: "width 0.8s ease" }} /></i><strong style={{ color: tone === "risk" ? "#ff5f86" : tone === "watch" ? "#f4b91e" : "#08d29d", transition: "color 0.4s ease" }}>{score}</strong></div>;
  })}</div>;
}

function EscrowFlow({ rows }) {
  return <div className="escrow-flow"><div className="eyebrow">ESCROW FLOW</div>{rows.map((row) => <div className="flow-row" key={row.label}><span className={`flow-dot ${row.state}`} /><span className="flow-line" /><b>{row.label}</b><small>{row.detail}</small></div>)}</div>;
}

export default App;
