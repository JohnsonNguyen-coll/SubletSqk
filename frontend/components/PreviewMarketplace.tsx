'use client';

import {useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {ArrowRight, ArrowUpRight, Check, Clock3, Coins, RotateCcw, ShieldCheck, Wallet} from 'lucide-react';
import Brand from './Brand';
import BrandName from './BrandName';

type View = 'browse'|'squeeks'|'rentals'|'earnings';
type Role = 'holder'|'guest';
type Squeek = {id:number; holder:Role; price:number; min:number; max:number; escrowed:boolean; listed:boolean; renter:Role|null; expiresAt:number};
type PreviewState = {role:Role; squeeks:Squeek[]; guestBalance:number; holderEarnings:number; holderBalance:number};
const storageKey = 'veilhub-test-v1';
const introKey = 'veilhub-test-intro-ack';
const initial = ():PreviewState=>({role:'guest',guestBalance:250,holderEarnings:0,holderBalance:0,squeeks:[
  {id:104,holder:'holder',price:12,min:1,max:7,escrowed:true,listed:true,renter:null,expiresAt:0},
  {id:207,holder:'holder',price:8,min:1,max:14,escrowed:false,listed:false,renter:null,expiresAt:0},
]});
const tabs = [['browse','/app/','Explore'],['squeeks','/app/squeeks/','My Squeeks'],['rentals','/app/rentals/','My Rentals'],['earnings','/app/earnings/','Earnings']] as const;
const sampleArt = '/brand/veilhub-mark.svg';

export default function PreviewMarketplace({view}:{view:View}) {
  const [state,setState] = useState<PreviewState>(initial);
  const [loaded,setLoaded] = useState(false);
  const [now,setNow] = useState(0);
  const [days,setDays] = useState(2);
  const [selected,setSelected] = useState<number|null>(null);
  const [price,setPrice] = useState('8');
  const [min,setMin] = useState('1');
  const [max,setMax] = useState('7');
  const [notice,setNotice] = useState('');
  const [introReady,setIntroReady] = useState(false);
  const [introAccepted,setIntroAccepted] = useState(false);

  useEffect(()=>{
    try {const saved=localStorage.getItem(storageKey)??localStorage.getItem('subletsqk-test-v1');if(saved){const parsed=JSON.parse(saved) as PreviewState;if(Array.isArray(parsed.squeeks))setState(parsed);}} catch {}
    setLoaded(true);
    try {setIntroAccepted(new URLSearchParams(window.location.search).get('intro')==='1'?false:sessionStorage.getItem(introKey)==='yes'||sessionStorage.getItem('subletsqk-test-intro-ack')==='yes');} catch {}
    setIntroReady(true);
  },[]);
  useEffect(()=>{if(loaded)localStorage.setItem(storageKey,JSON.stringify(state));},[state,loaded]);
  useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);

  const update=(fn:(draft:PreviewState)=>void)=>setState(current=>{const next=structuredClone(current);fn(next);return next;});
  const choose=(id:number)=>{setSelected(id);setNotice('');};
  const rent=(id:number)=>{
    const item=state.squeeks.find(s=>s.id===id);
    if(!item||!item.listed||item.holder===state.role||days<item.min||days>item.max)return;
    const total=item.price*days;
    if(state.guestBalance<total){setNotice('The guest needs more test SQK. Reset the test to refill.');return;}
    update(next=>{const target=next.squeeks.find(s=>s.id===id)!;target.listed=false;target.renter=next.role;target.expiresAt=Date.now()+days*86400000;next.guestBalance-=total;next.holderEarnings+=total*0.95;});
    setSelected(null);setNotice(`Stay confirmed for ${days} day${days===1?'':'s'}. Switch to My Rentals to see the timer.`);
  };
  const list=(event:FormEvent,id:number)=>{
    event.preventDefault();const daily=Number(price),minDays=Number(min),maxDays=Number(max);
    if(!Number.isFinite(daily)||daily<=0||!Number.isInteger(minDays)||!Number.isInteger(maxDays)||minDays<1||maxDays<minDays||maxDays>365){setNotice('Enter a positive price and a duration between 1 and 365 days.');return;}
    update(next=>{const target=next.squeeks.find(s=>s.id===id)!;target.price=daily;target.min=minDays;target.max=maxDays;target.escrowed=true;target.listed=true;});
    setNotice(`Squeek #${id} is now available in Explore.`);
  };
  const expire=(id:number)=>{update(next=>{next.squeeks.find(s=>s.id===id)!.expiresAt=Date.now()-1000;});setNotice(`Squeek #${id} reached the end of its stay.`);};
  const withdraw=(id:number)=>{update(next=>{const target=next.squeeks.find(s=>s.id===id)!;target.escrowed=false;target.listed=false;target.renter=null;target.expiresAt=0;});setNotice(`Squeek #${id} is back in the holder wallet.`);};
  const titles={browse:'Find a little resident.',squeeks:'Your Squeeks, your terms.',rentals:'Your stays, at a glance.',earnings:'Rental proceeds, at a glance.'};
  const available=state.squeeks.filter(s=>s.listed);
  const mine=state.squeeks.filter(s=>s.holder===state.role);
  const rentals=state.squeeks.filter(s=>s.renter===state.role&&s.expiresAt>0);
  const rows=view==='browse'?available:view==='squeeks'?mine:rentals;

  return <>
    {introReady&&!introAccepted&&<div className="preview-overlay test-intro-overlay"><section className="preview-dialog test-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="test-intro-title" aria-describedby="test-intro-description"><span className="eyebrow">BEFORE YOU ENTER</span><h2 id="test-intro-title">Welcome to VeilHub</h2><p id="test-intro-description">This app currently uses sample Squeeks and test SQK because official Squeek NFTs and SQK are not available for an open end-to-end test. You can try listing, renting, expiry, withdrawal and claiming here. No wallet is needed, and nothing is sent on-chain.</p><button autoFocus className="button primary" onClick={()=>{try{sessionStorage.setItem(introKey,'yes');}catch{}setIntroAccepted(true);}}>OK, start testing <ArrowRight size={16}/></button></section></div>}
    <div className="testnet-strip preview-strip">TEST MODE <span className="strip-divider">/</span> No wallet, assets or on-chain transactions</div>
    <header className="header shell app-header preview-header"><Link href="/" className="wordmark"><Brand/><BrandName/></Link>
      <nav className="primary-nav" aria-label="App navigation">{tabs.map(([key,url,label])=><Link key={key} href={url} aria-current={key===view?'page':undefined}>{label}</Link>)}</nav>
      <Link className="preview-live-link" href="/docs/">Docs <ArrowUpRight size={14}/></Link>
    </header>
    <main className="shell app-main preview-main" id="main-content">
      <div className="preview-heading"><div><span className="eyebrow">TRY THE RENTAL FLOW</span><h1>{titles[view]}</h1><p>Explore how a listing, stay and payout work. Everything here stays in this browser.</p></div><div className="preview-role" aria-label="Choose preview role"><span>VIEW AS</span><button className={state.role==='holder'?'active':''} onClick={()=>update(next=>{next.role='holder'})}>Holder</button><button className={state.role==='guest'?'active':''} onClick={()=>update(next=>{next.role='guest'})}>Guest</button></div></div>
      <div className="preview-disclosure"><ShieldCheck size={18}/><span>Test records only. No wallet signature, SQK transfer or NFT deposit occurs here. <Link href="/docs/">Read the protocol docs <ArrowUpRight size={14}/></Link></span></div>
      {notice&&<div className="preview-notice" role="status"><Check size={16}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss message">×</button></div>}
      {view==='earnings'?<div className="preview-earnings"><Coins size={30}/><span className="eyebrow">RENTAL EARNINGS</span><strong>{state.role==='holder'?state.holderEarnings.toFixed(2):'0.00'} <small>SQK</small></strong><p>This test balance comes from rental payments, not SqueekMining rewards. Switch to Holder to claim it.</p><button className="button primary" disabled={state.role!=='holder'||!state.holderEarnings} onClick={()=>{update(next=>{next.holderBalance+=next.holderEarnings;next.holderEarnings=0;});setNotice('Earnings moved to the holder test balance.');}}>Claim earnings <ArrowRight size={16}/></button><small>Holder test balance: {state.holderBalance.toFixed(2)} SQK · Guest test balance: {state.guestBalance.toFixed(2)} SQK</small></div>:<>
        <div className="preview-section-title"><span>{view==='browse'?'AVAILABLE SQUEEKS':view==='squeeks'?'YOUR COLLECTION':'YOUR RENTALS'}</span><b>{rows.length}</b></div>
        {rows.length?<div className="preview-grid">{rows.map(s=><article className="preview-card" key={s.id}><div className="preview-art"><img src={sampleArt} alt=""/><span>{s.escrowed?'IN ESCROW':'IN WALLET'}</span></div><div className="preview-card-body"><h2>Squeek #{s.id}</h2><p>{s.price} SQK / day · {s.min}–{s.max} days</p>{view==='browse'?<button className="button primary" disabled={state.role===s.holder} onClick={()=>{choose(s.id);setDays(s.min)}}>{state.role===s.holder?'Your listing':'Rent this Squeek'} <ArrowRight size={16}/></button>:view==='squeeks'?<>{!s.escrowed?<form className="preview-list-form" onSubmit={e=>list(e,s.id)}><div><label>Price / day<input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Min<input type="number" min="1" max="365" value={min} onChange={e=>setMin(e.target.value)}/></label><label>Max<input type="number" min="1" max="365" value={max} onChange={e=>setMax(e.target.value)}/></label></div><button className="button primary">List Squeek <ArrowRight size={16}/></button></form>:<><p className="preview-state">{s.expiresAt>now?'Rented until '+new Date(s.expiresAt).toLocaleString():s.expiresAt?'Stay complete':s.listed?'Ready to rent':'Not listed'}</p>{s.expiresAt>now&&<button className="button secondary" onClick={()=>expire(s.id)}>Advance to expiry <Clock3 size={15}/></button>}{s.expiresAt<=now&&<div className="preview-actions">{s.listed&&<button className="button secondary" onClick={()=>{update(next=>{next.squeeks.find(item=>item.id===s.id)!.listed=false;});setNotice(`Squeek #${s.id} is delisted.`);}}>Delist</button>}<button className="button primary" onClick={()=>withdraw(s.id)}>Withdraw <ArrowRight size={16}/></button></div>}</>}</>:<><p className="preview-state">{s.expiresAt>now?`Time left: ${Math.ceil((s.expiresAt-now)/60000)} min`:'Stay complete'}</p><p>Usage ends when the timer reaches zero. The NFT stays with escrow until its holder withdraws it.</p></>}</div></article>)}</div>:<div className="preview-empty"><Wallet size={30}/><h2>{view==='browse'?'No Squeeks available right now.':view==='squeeks'?'This role has no Squeeks.':'No stays for this role yet.'}</h2><p>{view==='browse'?'Switch to Holder, list a Squeek, then return as Guest.':view==='squeeks'?'Switch to Holder to list or withdraw a Squeek.':'Open Explore as Guest and rent a Squeek.'}</p><Link className="button secondary" href={view==='browse'?'/app/squeeks/':'/app/'}>{view==='browse'?'My Squeeks':'Explore'} <ArrowRight size={16}/></Link></div>}
      </>}
      {selected!==null&&<div className="preview-overlay" role="presentation" onClick={()=>setSelected(null)}><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-rent-title" onClick={e=>e.stopPropagation()}><button className="preview-close" aria-label="Close" onClick={()=>setSelected(null)}>×</button><span className="eyebrow">CHECK IN</span><h2 id="preview-rent-title">Rent Squeek #{selected}</h2><p>Choose a stay. This action changes test records in your browser only.</p><label>Length of stay (days)<input type="number" min={state.squeeks.find(s=>s.id===selected)?.min} max={state.squeeks.find(s=>s.id===selected)?.max} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><div className="preview-quote"><span>Total</span><strong>{(state.squeeks.find(s=>s.id===selected)?.price||0)*days} SQK</strong><span>Holder / protocol</span><strong>95% / 5%</strong></div><button className="button primary" disabled={!Number.isInteger(days)||days<(state.squeeks.find(s=>s.id===selected)?.min||1)||days>(state.squeeks.find(s=>s.id===selected)?.max||1)} onClick={()=>rent(selected)}>Confirm stay <ArrowRight size={16}/></button></section></div>}
      <div className="preview-footer"><button onClick={()=>{setState(initial());setNotice('Test reset.');}}>Reset test <RotateCcw size={14}/></button><span>Test data is kept only in this browser.</span></div>
    </main>
  </>;
}
