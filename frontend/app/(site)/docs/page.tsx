import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight, ArrowUpRight, FileCode2, House, KeyRound, ShieldCheck, ShoppingBag, ChartNoAxesCombined} from 'lucide-react';
import deployment from '../../../lib/deployment.json';
import tradeDeployment from '../../../lib/trade-deployment.json';

export const metadata:Metadata={
  title:'VeilHub',
  description:'Protocol documentation for VeilHub NFT rentals, SQK trading and staking scenarios on Ethereum Sepolia.',
};

const topics=[
  {number:'01',slug:'renting',title:'Renting',description:'Payment, duration, expiry and the exact scope of usage rights.',Icon:KeyRound},
  {number:'02',slug:'listing',title:'Listing',description:'Depositing an NFT, setting terms, delisting and withdrawing.',Icon:House},
  {number:'03',slug:'trading',title:'NFT trading',description:'Escrow sales, SQK settlement, royalties and reward ownership.',Icon:ShoppingBag},
  {number:'04',slug:'staking',title:'Staking power and scenarios',description:'Explore the deployed Sepolia power model with editable assumptions.',Icon:ChartNoAxesCombined},
  {number:'05',slug:'security',title:'Security & limits',description:'Escrow guarantees, administrative powers and known limitations.',Icon:ShieldCheck},
  {number:'06',slug:'contracts',title:'Contracts & API',description:'Deployment addresses, public reads and lifecycle functions.',Icon:FileCode2},
] as const;

const lifecycle=[
  ['Deposit','The holder approves and deposits one Squeek into contract escrow.'],
  ['Rent','A renter pays the quoted amount in SQK for a fixed number of whole days.'],
  ['Use','The registry recognizes the renter until the on-chain expiry timestamp.'],
  ['Exit','Usage expires automatically; the holder withdraws the NFT and each party claims earnings.'],
] as const;

export default function Docs(){
  return <div className="docs-shell docs-overview">
    <header className="docs-heading">
      <div className="docs-kicker">DOCUMENTATION <span>/</span> OVERVIEW</div>
      <h1>Documentation</h1>
      <p>Guides to renting and trading Squeek NFTs, understanding contract escrow, and exploring staking scenarios on Ethereum Sepolia.</p>
    </header>

    <section className="docs-deployment" aria-labelledby="docs-deployment-title">
      <div className="docs-deployment-head"><div><span className="docs-status"><span className="live-dot"/> LIVE ON TESTNET</span><h2 id="docs-deployment-title">Deployment status</h2></div><span>Ethereum Sepolia · Chain ID 11155111</span></div>
      <div className="docs-deployment-grid"><div><span>RENTAL CONTRACT</span>{deployment.address?<a href={'https://eth-sepolia.blockscout.com/address/'+deployment.address} target="_blank" rel="noreferrer"><code>{deployment.address}</code><ArrowUpRight size={15}/></a>:<em>Pending deployment</em>}</div><div><span>TRADE CONTRACT</span>{tradeDeployment.address?<a href={'https://eth-sepolia.blockscout.com/address/'+tradeDeployment.address} target="_blank" rel="noreferrer"><code>{tradeDeployment.address}</code><ArrowUpRight size={15}/></a>:<em>Pending deployment</em>}</div></div>
      <p>Official Sepolia Staking is deployed. VeilHub reads its power settings and your position; reward scenarios remain estimates.</p>
    </section>

    <section className="docs-section" aria-labelledby="docs-start-title">
      <div className="docs-section-heading"><div><span className="docs-label">BROWSE BY TOPIC</span><h2 id="docs-start-title">Explore the guides</h2></div><p>Clear steps, contract behavior and limits for every part of VeilHub.</p></div>
      <div className="docs-topic-grid">{topics.map(({number,slug,title,description,Icon})=><Link href={'/docs/'+slug+'/'} className="docs-topic-card" key={slug}><div className="docs-card-top"><Icon size={23}/><span>{number}</span></div><h3>{title}</h3><p>{description}</p><span className="docs-card-link">Read guide <ArrowRight size={15}/></span></Link>)}</div>
    </section>

    <section className="docs-section docs-primer" aria-labelledby="docs-model-title">
      <div className="docs-section-heading"><div><span className="docs-label">PROTOCOL MODEL</span><h2 id="docs-model-title">The essential facts</h2></div><p>These rules are enforced by the deployed rental contract. The app reads its state directly from Sepolia.</p></div>
      <div className="docs-fact-table" role="table" aria-label="Protocol facts">
        <div role="row"><strong role="cell">Custody</strong><span role="cell">The listed NFT sits in contract escrow. The renter never becomes its ERC-721 owner.</span></div>
        <div role="row"><strong role="cell">Payment</strong><span role="cell">The renter pays SQK upfront. The default split is 95% holder / 5% protocol, credited for later claim.</span></div>
        <div role="row"><strong role="cell">Duration</strong><span role="cell">The holder sets a range of 1–365 whole days. Usage ends at the recorded expiry, without a transaction.</span></div>
        <div role="row"><strong role="cell">Integration</strong><span role="cell">External apps must explicitly call <code>isUsable(tokenId, account)</code> to recognize a renter.</span></div>
      </div>
    </section>

    <section className="docs-section" aria-labelledby="docs-flow-title">
      <div className="docs-section-heading"><div><span className="docs-label">LIFECYCLE</span><h2 id="docs-flow-title">From listing to withdrawal</h2></div></div>
      <ol className="docs-lifecycle">{lifecycle.map(([title,body],i)=><li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
    </section>

    <aside className="docs-compatibility"><ShieldCheck size={22}/><div><span className="docs-label">READ BEFORE RENTING</span><h2>Usage does not grant staking access</h2><p>Official Squeekchain Staking requires an NFT deposit and does not recognize VeilHub rental rights. A rental does not provide staking eligibility, reward sharing or ERC-4907 rights.</p><Link href="/docs/security/">Read security and compatibility limits <ArrowRight size={16}/></Link></div></aside>

    <footer className="docs-reference-footer"><div><span className="docs-label">PRIMARY REFERENCES</span><p>Review official Squeekchain documentation alongside this protocol guide.</p></div><a href="https://docs.squeekchain.com/developers/" target="_blank" rel="noreferrer">Squeekchain developer docs <ArrowUpRight size={15}/></a><Link href="/app/">Open the app <ArrowUpRight size={15}/></Link></footer>
  </div>;
}
