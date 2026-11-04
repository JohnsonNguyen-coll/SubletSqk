import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, ArrowRight, ArrowUpRight, ShieldCheck} from 'lucide-react';
import {guides,type GuideSlug} from '../../../../lib/docs';
import DocsNav from '../../../../components/DocsNav';
import deployment from '../../../../lib/deployment.json';
import tradeDeployment from '../../../../lib/trade-deployment.json';

export function generateStaticParams(){return Object.keys(guides).map(slug=>({slug}))}
export const dynamicParams=false;

const addresses=[
  ['Rental contract',deployment.address],
  ['Trade contract',tradeDeployment.address],
  ['Squeek NFT','0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6'],
  ['SQK token','0x6872bfa5ccc3e9e440c6c16e5ffdabb8dba4cc76'],
] as const;

export default async function Guide({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!(slug in guides))notFound();
  const guide=guides[slug as GuideSlug];
  return <div className="marketing-container inner-page docs-shell guide-page">
    <Link className="docs-breadcrumb" href="/docs/"><ArrowLeft size={15}/> Documentation <span>/</span> {guide.title}</Link>
    <DocsNav/>
    <header className="docs-guide-heading"><span className="docs-label">VEILHUB PROTOCOL · SEPOLIA</span><h1>{guide.title}</h1><p>{guide.subtitle}</p></header>
    {slug==='contracts'&&<section className="docs-addresses" aria-label="Contract addresses"><div className="docs-addresses-head"><ShieldCheck size={18}/><strong>Deployment addresses</strong><span>Ethereum Sepolia · 11155111</span></div>{addresses.map(([label,address])=><div className="docs-address-row" key={label}><span>{label}</span>{address?<a href={'https://eth-sepolia.blockscout.com/address/'+address} target="_blank" rel="noreferrer"><code>{address}</code><ArrowUpRight size={15}/></a>:<em>Pending deployment</em>}</div>)}</section>}
    <article className="docs-guide-article">{guide.sections.map((section,i)=><section key={section.title} id={'section-'+(i+1)}><span className="docs-guide-number">0{i+1}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></section>)}</article>
    <aside className="docs-guide-reference"><span className="docs-label">REFERENCES & NEXT STEPS</span><div><a href="https://docs.squeekchain.com/developers/" target="_blank" rel="noreferrer">Official Squeekchain developer documentation <ArrowUpRight size={15}/></a><a href="https://docs.squeekchain.com/developers/mining/" target="_blank" rel="noreferrer">Mining and ownership rules <ArrowUpRight size={15}/></a><Link href="/docs/">All VeilHub documentation <ArrowRight size={15}/></Link></div></aside>
    <div className="docs-guide-footer"><Link href="/docs/" className="text-link"><ArrowLeft size={16}/> Documentation overview</Link><Link href="/app/" className="button primary">Launch app <ArrowUpRight size={17}/></Link></div>
  </div>;
}
