import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export default function LaunchCTA(){return <section className="launch-section"><span className="eyebrow">A NEW PLACE TO PLAY</span><h2>Your next stay<br/>starts with a Squeek.</h2><p>Explore the marketplace. Find your little corner of the burrow.</p><Link className="button primary" href="/app/">Launch app <ArrowUpRight size={18}/></Link><span className="launch-caption">Ethereum Sepolia · Wallet connection inside the app</span></section>}
