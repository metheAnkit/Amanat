const updated = "September 23, 2026";

export function LegalPage({ type }) {
  const terms = type === "terms";
  return <main className="legal-page">
    <header className="legal-header"><a href="/" className="legal-brand">AMANAT</a><a className="back-link" href="/">Back to Amanat</a></header>
    <article className="legal-content">
      <div className="eyebrow">AMANAT / LEGAL</div>
      <h1>{terms ? "Terms and Conditions" : "Privacy Policy"}</h1>
      <p className="legal-updated">Last updated: {updated}</p>
      {terms ? <Terms /> : <Privacy />}
    </article>
    <footer className="legal-footer">Copyright © 2026 Amanat. All rights reserved.</footer>
  </main>;
}

function Terms() {
  return <>
    <h2>1. What Amanat is</h2><p>Amanat ("the Project," "we," "our") is a demonstration project built for Hacker House Goa 2026. It shows how an AI agent can be given a bounded spending mandate, enforced by a smart contract, with payments held in escrow until an independent validator confirms the delivered work.</p><p>Amanat is a technology demonstration, not a financial service, a bank, a money transmitter, or an investment product. Nothing on this site is an offer to buy, sell, or trade any asset, and nothing here is investment, legal, or tax advice.</p>
    <h2>2. Eligibility</h2><p>You must be able to form a binding contract under the laws that apply to you, and you must comply with the laws of your own jurisdiction regarding cryptocurrency and smart contract use. If cryptocurrency interactions are restricted or prohibited where you are, do not use this site.</p>
    <h2>3. Testnet and demo status</h2><p>Unless stated otherwise on the page you are viewing, Amanat runs on public test networks, including Base Sepolia and Arbitrum Sepolia, using test tokens with no real-world value. Any USDC, ETH, or other asset used in a demo is test currency obtained from a public faucet. If a deployment later moves to a production network with real assets, that will be stated clearly on the relevant page, and additional terms may apply.</p>
    <h2>4. No custody, no control over your wallet</h2><p>Amanat does not hold your funds, private keys, or seed phrase. All USDC deposits are made directly to the MandateVault smart contract from your own wallet, under your own signature. We cannot move, freeze, recover, or reverse a transaction on your behalf. You are solely responsible for your wallet and keys.</p>
    <h2>5. Smart contract and technology risk</h2><p>By using Amanat, you acknowledge that the MandateVault and AmanatEscrow contracts have not been professionally audited and may contain bugs, vulnerabilities, or logic errors. Blockchain transactions are irreversible. The validator in this demo is a single operator-controlled key. RPC providers, ERC-8004 registries, Circle USDC, MongoDB, and hosting providers may fail or become unavailable.</p><p><strong>Use only funds you can afford to lose. Do not deposit real assets into an unaudited contract.</strong></p>
    <h2>6. Acceptable use</h2><p>You agree not to use Amanat for unlawful purposes, money laundering, sanctions evasion, fraud, malware, spam, or attempts to exploit, disable, overload, or harm the contracts or services.</p>
    <h2>7. Intellectual property</h2><p>The source code is provided as described in the repository, README, and any included license. Where no license file is present, no license to use, copy, or distribute the code is granted beyond evaluation as a hackathon submission.</p>
    <h2>8. No warranty</h2><p>Amanat is provided as is and as available, without warranties of any kind, including merchantability, fitness for a particular purpose, non-infringement, uninterrupted service, security, or error-free operation.</p>
    <h2>9. Limitation of liability</h2><p>To the fullest extent permitted by law, the creators of Amanat are not liable for direct, indirect, incidental, special, consequential, or exemplary damages, including loss of funds, data, or profits arising from use of, or inability to use, Amanat.</p>
    <h2>10. Changes to these terms</h2><p>These terms may be updated as the project changes. Continued use after an update constitutes acceptance of the revised terms.</p>
    <h2>11. Governing law</h2><p>These terms are governed by the laws of India. Any dispute will be subject to the jurisdiction of the courts of India.</p>
    <h2>12. Contact</h2><p>Questions about these terms can be sent to <a href="mailto:amanatofficialx004@gmail.com">amanatofficialx004@gmail.com</a>.</p>
  </>;
}

function Privacy() {
  return <>
    <h2>1. Information we do not collect</h2><p>We do not ask for or store your name, email address, phone number, government ID, or payment card details. There is no account system and no login.</p>
    <h2>2. Information that is inherently public</h2><p>Amanat is built on public blockchains. Your wallet address, deposits, payments, agent identity, reputation feedback, transaction hashes, and gas fees are public, permanent, and visible through block explorers such as Basescan or Arbiscan.</p>
    <h2>3. Information stored in our database</h2><p>The gateway stores payment receipts in MongoDB to power the dashboard. A receipt may include the chain, escrow ID, mandate ID, buyer and seller addresses, amount, status, validator score, validator notes, and timestamps. No personal information beyond wallet addresses is stored.</p>
    <h2>4. Information collected automatically</h2><p>If hosted, the hosting provider may log standard web request data such as IP address, browser type, and request timestamps for operational and security purposes. We do not use this data for tracking or advertising, and this project does not use analytics or advertising cookies.</p>
    <h2>5. Third parties</h2><p>Requests and transactions may pass through RPC providers, Circle USDC or a mock token, ERC-8004 registries, MongoDB Atlas, hosting providers, and optionally the Anthropic API when validator review is enabled. Each third party has its own privacy practices.</p>
    <h2>6. How information is used</h2><p>Receipt data is used only to power the dashboard by showing mandate usage, payment history, and seller reputation. It is not sold, shared with advertisers, or used to build a profile.</p>
    <h2>7. Data retention and deletion</h2><p>On-chain data is permanent and cannot be deleted by us. Off-chain receipt data can be deleted on request. Contact us with the wallet address or escrow ID involved.</p>
    <h2>8. Children's privacy</h2><p>This project is not directed to children and is not intended for anyone under 18.</p>
    <h2>9. Contact</h2><p>Questions or deletion requests can be sent to <a href="mailto:amanatofficialx004@gmail.com">amanatofficialx004@gmail.com</a>.</p>
    <h2>10. Changes to this policy</h2><p>This policy may be updated as the project's services or hosting change. The date above reflects the most recent revision.</p>
  </>;
}
