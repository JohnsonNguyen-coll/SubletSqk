import Link from 'next/link';
import {Plus,ArrowUpRight} from 'lucide-react';
import {faqs} from '../../../lib/docs';
import LaunchCTA from '../../../components/LaunchCTA';
export default function FAQ(){return <div className="marketing-container inner-page faq-page"><div className="page-intro"><span className="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span><h1>Small questions.<br/><span>Straight answers.</span></h1><p>The practical details of a temporary home for your Squeek.</p></div><div className="faq-list">{faqs.map(([question,answer],i)=><details key={question} open={i===0}><summary><span>{question}</span><Plus size={18}/></summary><p>{answer}</p></details>)}</div><div className="docs-outro"><span>Looking for the technical details?</span><Link href="/docs/" className="text-link">Open the documentation <ArrowUpRight size={17}/></Link></div><LaunchCTA/></div>}
