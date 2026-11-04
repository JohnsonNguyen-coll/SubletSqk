import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export default function LaunchCTA(){return <section className="launch-section"><span className="eyebrow">A NEW PLACE TO PLAY</span><h2>Your next stay<br/>starts with a Squeek.</h2><p>Explore live Sepolia listings and connect your wallet to take part.</p><Link className="button primary" href="/app/">Launch app <ArrowUpRight size={18}/></Link><span className="launch-caption">Sepolia testnet · Wallet required for transactions</span></section>}
