'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export default function DocsNav(){const path=usePathname().replace(/\/$/,'');return <nav className="docs-nav" aria-label="Documentation topics">{[['/docs/','Overview'],['/docs/renting/','Renting'],['/docs/listing/','Listing'],['/docs/security/','Security'],['/docs/contracts/','Contracts']].map(([href,label])=><Link key={href} href={href} aria-current={path===href.replace(/\/$/,'')?'page':undefined}>{label}</Link>)}</nav>}
