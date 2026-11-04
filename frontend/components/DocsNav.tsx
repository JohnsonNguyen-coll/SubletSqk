'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BookOpen, ArrowUpRight} from 'lucide-react';

const groups = [
  {label:'GET STARTED',links:[['/docs/','Overview'],['/docs/renting/','Renting a Squeek'],['/docs/listing/','Listing a Squeek']]},
  {label:'MARKETPLACE',links:[['/docs/trading/','NFT trading'],['/docs/staking/','Staking scenarios']]},
  {label:'REFERENCE',links:[['/docs/security/','Security & limits'],['/docs/contracts/','Contracts & API']]},
] as const;

export default function DocsNav(){
  const path=usePathname().replace(/\/$/,'');
  return <aside className="docs-sidebar">
    <div className="docs-sidebar-brand"><BookOpen size={19}/><div><strong>VeilHub Docs</strong><span>Sepolia · v0.1</span></div></div>
    <nav aria-label="Documentation topics">{groups.map(group=><div className="docs-nav-group" key={group.label}><span>{group.label}</span>{group.links.map(([href,label])=><Link key={href} href={href} aria-current={path===href.replace(/\/$/,'')?'page':undefined}>{label}</Link>)}</div>)}</nav>
    <div className="docs-sidebar-bottom"><span className="live-dot"/> Ethereum Sepolia <a href="https://docs.squeekchain.com/" target="_blank" rel="noreferrer" aria-label="Official Squeekchain docs"><ArrowUpRight size={14}/></a></div>
  </aside>;
}
