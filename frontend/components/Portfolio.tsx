'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {useAccount} from 'wagmi';
import {useConnectModal} from '@rainbow-me/rainbowkit';
import {formatUnits, zeroAddress, type Address} from 'viem';
import {ArrowUpRight, RefreshCw, Wallet} from 'lucide-react';
import AppShell from './AppShell';
import {client, NFT, SQK, STAKING, MARKET, TRADE, nftAbi, tokenAbi, stakingAbi, depositedEvent, stakingDeploymentBlock, marketAbi, tradeAbi, ownedSqueeks, readListing, explorer, short} from '../lib/chain';
import '../app/app/features.css';
import './portfolio.css';

const same=(a?:string,b?:string)=>!!a&&!!b&&a.toLowerCase()===b.toLowerCase();
const fmt=(v:bigint)=>Number(formatUnits(v,18)).toLocaleString('en-US',{maximumFractionDigits:4});
async function pages(contract:Address,abi:typeof marketAbi|typeof tradeAbi){
  const count=await client.readContract({address:contract,abi,functionName:'tokenCount'});
  const ids:bigint[]=[];
  for(let i=0n;i<count;i+=100n) ids.push(...await client.readContract({address:contract,abi,functionName:'tokenPage',args:[i,100n]}));
  return ids;
}
async function stakedIds(account:Address){
  const latest=await client.getBlockNumber();
  const candidates=new Set<bigint>();
  for(let fromBlock=stakingDeploymentBlock;fromBlock<=latest;fromBlock+=10000n){
    const logs=await client.getLogs({address:STAKING,event:depositedEvent,args:{account,collection:NFT},fromBlock,toBlock:fromBlock+9999n>latest?latest:fromBlock+9999n});
    for(const log of logs)if(log.args.tokenId!==undefined)candidates.add(log.args.tokenId);
  }
  const ids=[...candidates];
  const current=await Promise.all(ids.map(async id=>{
    const [depositor,owner]=await Promise.all([
      client.readContract({address:STAKING,abi:stakingAbi,functionName:'depositor',args:[NFT,id]}),
      client.readContract({address:NFT,abi:nftAbi,functionName:'ownerOf',args:[id]}).catch(()=>zeroAddress)
    ]);
    return same(depositor,account)&&same(owner,STAKING)?id:null;
  }));
  return current.filter((id):id is bigint=>id!==null);
}
export default function Portfolio(){
  const {address}=useAccount();const {openConnectModal}=useConnectModal();
  const data=useQuery({queryKey:['portfolio',address],enabled:!!address,refetchInterval:30000,queryFn:async()=>{
    const account=address!;
    const [wallet,staked,rentalIds,saleIds,balance,principal,power,rewards]=await Promise.all([
      ownedSqueeks(account),stakedIds(account),MARKET?pages(MARKET,marketAbi):Promise.resolve([]),TRADE?pages(TRADE,tradeAbi):Promise.resolve([]),
      client.readContract({address:SQK,abi:tokenAbi,functionName:'balanceOf',args:[account]}),
      client.readContract({address:STAKING,abi:stakingAbi,functionName:'stakeOf',args:[account]}),
      client.readContract({address:STAKING,abi:stakingAbi,functionName:'accountPower',args:[account]}),
      client.readContract({address:STAKING,abi:stakingAbi,functionName:'claimable',args:[account]})
    ]);
    const [rentals,sales]=await Promise.all([
      Promise.all(rentalIds.map(readListing)),
      Promise.all(saleIds.map(async id=>{const sale=await client.readContract({address:TRADE!,abi:tradeAbi,functionName:'sales',args:[id]});return {id,seller:sale[0],price:sale[1]};}))
    ]);
    const now=BigInt(Math.floor(Date.now()/1000));
    return {wallet,staked,balance,principal:principal[0],power:power[0]+power[1],rewards,
      forRent:rentals.filter(l=>same(l.owner,account)),
      renting:rentals.filter(l=>same(l.renter,account)&&l.expiresAt>now),
      forSale:sales.filter(s=>same(s.seller,account))};
  }});
  const groups=[
    {title:'In your wallet',description:'Squeeks you can list or deposit into official Staking.',ids:data.data?.wallet??[],href:'/app/squeeks/',action:'List for rent'},
    {title:'Staked with Squeekchain',description:'Deposited in the official Staking contract. Withdraw there before listing on VeilHub.',ids:data.data?.staked??[],href:'https://sepolia.squeekchain.com/account',action:'Open official account'},
    {title:'Listed for rent',description:'NFTs held by the VeilHub rental contract.',ids:data.data?.forRent.map(l=>l.id)??[],href:'/app/squeeks/',action:'Manage rentals'},
    {title:'Listed for sale',description:'NFTs held by the VeilHub trade contract.',ids:data.data?.forSale.map(s=>s.id)??[],href:'/app/trade/',action:'Manage sales'},
    {title:'Your active rentals',description:'Temporary VeilHub usage records. These are not Squeekchain staking rights.',ids:data.data?.renting.map(l=>l.id)??[],href:'/app/rentals/',action:'View rentals'}
  ];
  return <AppShell active="portfolio"><div className="portfolio-head"><div><span className="eyebrow">YOUR SEPOLIA POSITION</span><h1>Portfolio</h1><p>Your Squeeks and SQK across your wallet, VeilHub and official Squeekchain Staking.</p></div><a className="button primary" href="https://sepolia.squeekchain.com/mint" target="_blank" rel="noreferrer">Claim a test Squeek <ArrowUpRight size={16}/></a></div>
    <div className="portfolio-note">Official test claims depend on your Squeekchain eligibility. The claim page shows your allowance after you connect; VeilHub cannot issue NFTs or SQK.</div>
    {!address?<div className="feature-empty"><Wallet size={30}/><h2>Connect your Sepolia wallet</h2><p>We will read your on-chain assets and positions.</p><button className="button primary" onClick={()=>openConnectModal?.()}>Connect wallet</button></div>:data.isPending?<div className="feature-empty">Reading your Sepolia portfolio…</div>:data.isError?<div className="feature-empty" role="alert">Could not read your portfolio. <button onClick={()=>data.refetch()}>Retry <RefreshCw size={15}/></button></div>:<>
      <div className="portfolio-stats"><div><small>WALLET SQK</small><strong>{fmt(data.data.balance)}</strong></div><div><small>STAKED SQK</small><strong>{fmt(data.data.principal)}</strong></div><div><small>STAKING POWER</small><strong>{Number(formatUnits(data.data.power,18)).toLocaleString('en-US',{maximumFractionDigits:2})}</strong></div><div><small>CLAIMABLE STAKING SQK</small><strong>{fmt(data.data.rewards)}</strong></div></div>
      <div className="portfolio-groups">{groups.map(group=><section className="portfolio-group" key={group.title}><div className="portfolio-group-head"><div><h2>{group.title} <span>{group.ids.length}</span></h2><p>{group.description}</p></div>{group.href.startsWith('http')?<a href={group.href} target="_blank" rel="noreferrer">{group.action} <ArrowUpRight size={15}/></a>:<Link href={group.href}>{group.action} <ArrowUpRight size={15}/></Link>}</div>{group.ids.length?<div className="portfolio-tokens">{group.ids.map(id=><a key={id.toString()} href={explorer(NFT)+`?tab=token_transfers&token_id=${id}`} target="_blank" rel="noreferrer"><span>SQUEEK NFT</span><strong>#{id.toString()}</strong><ArrowUpRight size={15}/></a>)}</div>:<p className="portfolio-empty">No Squeeks in this position.</p>}</section>)}</div>
    </>}
    <footer className="feature-footer">Official NFT <a href={explorer(NFT)} target="_blank" rel="noreferrer">{short(NFT)}</a> · SQK <a href={explorer(SQK)} target="_blank" rel="noreferrer">{short(SQK)}</a> · Staking <a href={explorer(STAKING)} target="_blank" rel="noreferrer">{short(STAKING)}</a></footer>
  </AppShell>;
}
