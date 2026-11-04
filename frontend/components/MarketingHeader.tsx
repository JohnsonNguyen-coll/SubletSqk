'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import Brand from './Brand';
import BrandName from './BrandName';
const links=[['/','Home'],['/how-it-works/','How it works'],['/docs/','Docs'],['/faq/','FAQ']];
export default function MarketingHeader(){
  const path=usePathname();
  return <header className="marketing-header"><div className="marketing-header-inner"><Link href="/" className="wordmark"><Brand/><BrandName/></Link><nav aria-label="Site navigation">{links.map(([href,label])=>{const active=href==='/'?path==='/':path.startsWith(href.replace(/\/$/,''));return <Link key={href} href={href} aria-current={active?'page':undefined}>{label}</Link>})}</nav><Link className="button primary launch-button" href="/app/">Launch app <ArrowUpRight size={16}/></Link></div></header>;
}
