import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, ArrowRight, ArrowUpRight, ShieldCheck} from 'lucide-react';
import {guides,type GuideSlug} from '../../../../lib/docs';
import deployment from '../../../../lib/deployment.json';
import tradeDeployment from '../../../../lib/trade-deployment.json';

export function generateStaticParams(){return Object.keys(guides).map(slug=>({slug}))}
export const dynamicParams=false;

const addresses=[
  ['Rental contract',deployment.address],
  ['Trade contract',tradeDeployment.address],
  ['Squeek NFT','0xc4c7982657f00509548f3a3a41db7fa439a6856b'],
  ['SQK token','0xd78a3956cf63164d1fa1c622ad3c66623162fa1e'],
  ['SqueekStaking','0x50fd1780526c3186a0c037c7622203bc4fb611ca'],
] as const;

export default async function Guide({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!(slug in guides))notFound();
  const guide=guides[slug as GuideSlug];
  return <div className="docs-shell guide-page">
    <div className="docs-breadcrumb"><Link href="/docs/">Documentation</Link><span>/</span><span>{guide.title}</span></div>
    <header className="docs-guide-heading"><span className="docs-label">VEILHUB GUIDE <span className="docs-label-separator">·</span> ETHEREUM SEPOLIA</span><h1>{guide.title}</h1><p>{guide.subtitle}</p></header>
    {slug==='contracts'&&<section className="docs-addresses" aria-label="Contract addresses"><div className="docs-addresses-head"><ShieldCheck size={18}/><strong>Deployment addresses</strong><span>Ethereum Sepolia · 11155111</span></div>{addresses.map(([label,address])=><div className="docs-address-row" key={label}><span>{label}</span>{address?<a href={'https://eth-sepolia.blockscout.com/address/'+address} target="_blank" rel="noreferrer"><code>{address}</code><ArrowUpRight size={15}/></a>:<em>Pending deployment</em>}</div>)}</section>}
    <div className="docs-guide-grid"><article className="docs-guide-article">{guide.sections.map((section,i)=><section key={section.title} id={'section-'+(i+1)}><span className="docs-guide-number">{String(i+1).padStart(2,'0')}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></section>)}</article><aside className="docs-toc"><span>ON THIS PAGE</span><nav aria-label="On this page">{guide.sections.map((section,i)=><a key={section.title} href={'#section-'+(i+1)}>{section.title}</a>)}</nav></aside></div>
    <aside className="docs-guide-reference"><span className="docs-label">REFERENCES & NEXT STEPS</span><div><a href="https://docs.squeekchain.com/assets/deployments/sepolia.json" target="_blank" rel="noreferrer">Official Sepolia deployment record <ArrowUpRight size={15}/></a><a href="https://docs.squeekchain.com/rewards/staking/" target="_blank" rel="noreferrer">Official Staking guide <ArrowUpRight size={15}/></a><Link href="/docs/">All VeilHub documentation <ArrowRight size={15}/></Link></div></aside>
    <div className="docs-guide-footer"><Link href="/docs/" className="text-link"><ArrowLeft size={16}/> Documentation overview</Link><Link href="/app/" className="button primary">Launch app <ArrowUpRight size={17}/></Link></div>
  </div>;
}
