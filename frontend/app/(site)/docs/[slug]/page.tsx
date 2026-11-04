import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, ArrowUpRight} from 'lucide-react';
import {guides,type GuideSlug} from '../../../../lib/docs';
import DocsNav from '../../../../components/DocsNav';
import deployment from '../../../../lib/deployment.json';
export function generateStaticParams(){return Object.keys(guides).map(slug=>({slug}))}
export const dynamicParams=false;
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;return {title:`${guides[slug as GuideSlug]?.title||'Documentation'} | SubletSqk`}}
export default async function Guide({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;if(!(slug in guides))notFound();const guide=guides[slug as GuideSlug];
 return <div className="marketing-container inner-page docs-page guide-page"><Link className="back-link" href="/docs/"><ArrowLeft size={15}/> Documentation</Link><div className="page-intro"><span className="eyebrow">THE SUBLETSQK FIELD GUIDE</span><h1>{guide.title}</h1><p>{guide.subtitle}</p></div><DocsNav/><article className="guide-article">{slug==='contracts'&&<aside className="contract-status"><span className="live-dot"/><div><strong>Rental contract: {deployment.address||'not deployed'}</strong><p>{deployment.address?'The app uses the address recorded with its deployment receipt.':'The frontend is live. Rental transactions are unavailable until a Sepolia deployment address is recorded.'}</p></div></aside>}{guide.sections.map((section,i)=><section key={section.title}><span className="guide-number">0{i+1}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></section>)}<div className="guide-source"><span>Official Squeekchain references</span><a href="https://docs.squeekchain.com/developers/" target="_blank" rel="noreferrer">Deployment record & developer docs <ArrowUpRight size={14}/></a><a href="https://docs.squeekchain.com/developers/mining/" target="_blank" rel="noreferrer">Mining ownership rules <ArrowUpRight size={14}/></a></div><div className="guide-next"><Link href="/docs/" className="text-link"><ArrowLeft size={16}/> All documentation</Link><Link href="/app/" className="button primary">Launch app <ArrowUpRight size={17}/></Link></div></article></div>;
}
