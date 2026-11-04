'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {useAccount} from 'wagmi';
import {formatUnits,zeroAddress} from 'viem';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,Copy,RefreshCw} from 'lucide-react';
import {client,MARKET,NFT,SQK,MINING,marketAbi,nftAbi,miningAbi,readListing,explorer,short} from '../lib/chain';
import Brand from './Brand';
import BrandName from './BrandName';

type Metadata={name?:string;description?:string;image?:string;attributes?:{trait_type?:string;value?:string|number}[]};
const sqk=(value:bigint)=>Number(formatUnits(value,18)).toLocaleString('en-US',{maximumFractionDigits:4});

export default function SqueekDetail(){
  const params=useSearchParams();
  const raw=params.get('id')??'';
  const valid=/^\d{1,78}$/.test(raw);
  const id=valid?BigInt(raw):0n;
  const {address}=useAccount();
  const [now,setNow]=useState(0);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{setNow(Math.floor(Date.now()/1000));const timer=setInterval(()=>setNow(Math.floor(Date.now()/1000)),1000);return()=>clearInterval(timer)},[]);
  const detail=useQuery({queryKey:['squeek-detail',raw],enabled:valid&&!!MARKET,refetchInterval:30000,queryFn:async()=>{
    const [boundNft,boundSqk,listing,currentOwner,uri,claimable]=await Promise.all([
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'nft'}),
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'sqk'}),
      readListing(id),
      client.readContract({address:NFT,abi:nftAbi,functionName:'ownerOf',args:[id]}),
      client.readContract({address:NFT,abi:nftAbi,functionName:'tokenURI',args:[id]}),
      client.readContract({address:MINING,abi:miningAbi,functionName:'claimable',args:[0,[id]]})
    ]);
    if(boundNft.toLowerCase()!==NFT.toLowerCase()||boundSqk.toLowerCase()!==SQK.toLowerCase())throw new Error('Rental contract bindings do not match the official NFT and SQK.');
    if(!uri.startsWith('data:application/json;base64,'))throw new Error('Unsupported on-chain metadata format.');
    const metadata=JSON.parse(atob(uri.slice(29))) as Metadata;
    if(!metadata.image?.startsWith('data:image/svg+xml;base64,'))metadata.image=undefined;
    return {listing,currentOwner,metadata,claimable};
  }});
  const l=detail.data?.listing;
  const active=!!l&&Number(l.expiresAt)>now;
  const escrowed=!!l&&l.owner.toLowerCase()!==zeroAddress&&detail.data?.currentOwner.toLowerCase()===MARKET?.toLowerCase();
  const available=!!l&&l.listed&&!active;
  const remaining=l?Math.max(0,Number(l.expiresAt)-now):0;
  const copy=async()=>{try{await navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{setCopied(false)}};

  return <>
    <div className="testnet-strip"><span className="live-dot"/> SEPOLIA TESTNET <span className="strip-divider">/</span> On-chain Squeek details</div>
    <header className="header shell app-header"><Link href="/" className="wordmark"><Brand/><BrandName/></Link><nav className="primary-nav" aria-label="App navigation"><Link href="/app/">Explore</Link><Link href="/app/squeeks/">My Squeeks</Link><Link href="/app/rentals/">My Rentals</Link><Link href="/app/earnings/">Earnings</Link><Link href="/docs/">Docs</Link></nav><Link className="button secondary" href="/app/"><ArrowLeft size={15}/> Back</Link></header>
    <main className="shell squeek-detail" id="main-content">
      <div className="squeek-detail-top"><Link href="/app/"><ArrowLeft size={16}/> All listings</Link><span>Ethereum Sepolia · 11155111</span></div>
      {!valid?<div className="squeek-detail-message"><h1>Choose a Squeek</h1><p>Open a listing from Explore to see its on-chain details.</p><Link className="button primary" href="/app/">Explore listings <ArrowRight size={16}/></Link></div>:detail.isPending?<div className="squeek-detail-message"><RefreshCw className="spin"/><h1>Reading Squeek #{raw}</h1><p>Loading NFT metadata and rental terms from Sepolia.</p></div>:detail.isError?<div className="squeek-detail-message"><h1>Could not load this Squeek</h1><p>{detail.error instanceof Error?detail.error.message:'Check the token ID and RPC connection.'}</p><button className="button secondary" onClick={()=>detail.refetch()}>Try again <RefreshCw size={16}/></button></div>:<div className="squeek-detail-grid">
        <div className="squeek-detail-art">{detail.data.metadata.image?<img src={detail.data.metadata.image} alt={`On-chain artwork for Squeek #${raw}`}/>:<span>Artwork unavailable</span>}</div>
        <div className="squeek-detail-info"><span className="eyebrow">SQUEEK #{raw} · LIVE ON SEPOLIA</span><h1>{detail.data.metadata.name||`Squeek #${raw}`}</h1><p>{detail.data.metadata.description||'Official Squeek NFT with on-chain metadata.'}</p><div className="squeek-detail-status">{active?'Rental active':available?'Available to rent':escrowed?'In escrow · not listed':'Not listed on VeilHub'}</div>
          <dl className="squeek-detail-facts">
            <div><dt>Current NFT owner</dt><dd><a href={explorer(detail.data.currentOwner)} target="_blank" rel="noreferrer">{short(detail.data.currentOwner)} ↗</a></dd></div>
            {escrowed&&<div><dt>Depositor</dt><dd><a href={explorer(l!.owner)} target="_blank" rel="noreferrer">{short(l!.owner)} ↗</a></dd></div>}
            {l&&l.owner!==zeroAddress&&<div><dt>Price per day</dt><dd>{sqk(l.pricePerDay)} SQK</dd></div>}
            {l&&l.owner!==zeroAddress&&<div><dt>Duration</dt><dd>{l.minDays}–{l.maxDays} days</dd></div>}
            {l&&l.owner!==zeroAddress&&<div><dt>Holder / protocol</dt><dd>{100-l.feeBps/100}% / {l.feeBps/100}%</dd></div>}
            {active&&<div><dt>Renter</dt><dd>{short(l!.renter)}</dd></div>}
            {active&&<div><dt>Time remaining</dt><dd>{Math.floor(remaining/86400)}d {Math.floor(remaining%86400/3600)}h {Math.floor(remaining%3600/60)}m</dd></div>}
            <div><dt>Unclaimed mining rewards</dt><dd>{sqk(detail.data.claimable)} SQK</dd></div>
          </dl>
          <p className="squeek-detail-note">Mining rewards are separate from rental proceeds. Current Squeekchain owner-only actions do not recognize a renter. While this NFT is escrowed, its depositor cannot claim those rewards.</p>
          <div className="squeek-detail-actions">{available&&address?.toLowerCase()!==l!.owner.toLowerCase()&&<Link className="button primary" href={`/app/?rent=${raw}`}>Rent this Squeek <ArrowRight size={16}/></Link>}{escrowed&&address?.toLowerCase()===l!.owner.toLowerCase()&&<Link className="button primary" href="/app/squeeks/">Manage listing <ArrowRight size={16}/></Link>}<button className="button secondary" onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copied':'Copy link'}</button><a className="button secondary" href={`${explorer(NFT)}?tab=token_transfers&token_id=${raw}`} target="_blank" rel="noreferrer">View on explorer <ArrowUpRight size={16}/></a></div>
          {detail.data.metadata.attributes?.length?<div className="squeek-detail-traits"><h2>On-chain traits</h2><div>{detail.data.metadata.attributes.slice(0,8).map((trait,index)=><span key={index}><small>{trait.trait_type||'Trait'}</small><strong>{String(trait.value??'—')}</strong></span>)}</div></div>:null}
        </div>
      </div>}
    </main>
  </>;
}
