'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatUnits, parseUnits, zeroAddress, type Hash } from 'viem';
import { ArrowUpRight, ArrowRight, Search, SlidersHorizontal, KeyRound, ShieldCheck, Wallet, Clock3, X, Check, LoaderCircle, RefreshCw, House, Coins, CircleHelp } from 'lucide-react';
import { client, MARKET, NFT, SQK, marketAbi, nftAbi, tokenAbi, readListing, ownedSqueeks, short, explorer, type Listing } from '../lib/chain';
import Brand from './Brand';
import BrandName from './BrandName';

type View = 'browse'|'squeeks'|'rentals'|'earnings';
const tabs = [['browse','/app/','Explore'],['squeeks','/app/squeeks/','My Squeeks'],['rentals','/app/rentals/','My Rentals'],['earnings','/app/earnings/','Earnings']] as const;
const amount = (value: bigint) => formatUnits(value,18);
const same = (a?: string,b?: string) => !!a && !!b && a.toLowerCase()===b.toLowerCase();
function message(error: unknown) { const e = error as {shortMessage?:string;message?:string}; return e.shortMessage || e.message || 'The transaction could not be completed.'; }

export default function Marketplace({view}: {view: View}) {
  const {address, chainId, isConnected} = useAccount();
  const {openConnectModal} = useConnectModal();
  const {switchChainAsync} = useSwitchChain();
  const {writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  const [error,setError] = useState('');
  const [hash,setHash] = useState<Hash>();
  const [now,setNow] = useState(0);
  const [search,setSearch] = useState('');
  const [sort,setSort] = useState('newest');
  const [daysFilter,setDaysFilter] = useState('');
  const [filters,setFilters] = useState(false);
  const [page,setPage] = useState(1);
  const [selected,setSelected] = useState<Listing>();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [days,setDays] = useState(1);
  const [ack,setAck] = useState(false);
  const [lookup,setLookup] = useState('');
  const [owned,setOwned] = useState<bigint>();
  const [lookupBusy,setLookupBusy] = useState(false);
  const [price,setPrice] = useState('');
  const [min,setMin] = useState('1');
  const [max,setMax] = useState('7');
  useEffect(()=>{setOwned(undefined);setLookup('');},[address]);
  useEffect(()=>{setNow(Math.floor(Date.now()/1000));const t=setInterval(()=>setNow(Math.floor(Date.now()/1000)),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(!selected)return; const close=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)setSelected(undefined)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[selected,busy]);
  useEffect(()=>{if(selected&&!dialogRef.current?.open)dialogRef.current?.showModal();},[selected]);
  const market = useQuery({queryKey:['market'],enabled:!!MARKET,refetchInterval:20000,queryFn:async()=>{
    const [code,nft,sqk,paused,fee,count,block] = await Promise.all([
      client.getCode({address:MARKET!}),
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'nft'}),
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'sqk'}),
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'paused'}),
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'feeBps'}),
      client.readContract({address:MARKET!,abi:marketAbi,functionName:'tokenCount'}),client.getBlockNumber()
    ]);
    if(!code || !same(nft,NFT) || !same(sqk,SQK))throw new Error('Deployment binding mismatch. Transactions disabled.');
    return {paused,fee,count,block};
  }});
  const records = useQuery({queryKey:['listings',market.data?.count.toString()],enabled:!!MARKET&&!!market.data,refetchInterval:20000,queryFn:async()=>{
    const ids:bigint[]=[];
    for(let cursor=0n;cursor<market.data!.count;cursor+=100n) ids.push(...await client.readContract({address:MARKET!,abi:marketAbi,functionName:'tokenPage',args:[cursor,100n]}));
    const result:Listing[]=[];
    for(let i=0;i<ids.length;i+=40)result.push(...await Promise.all(ids.slice(i,i+40).map(readListing)));
    return result.filter(l=>!same(l.owner,zeroAddress));
  }});
  const earnings = useQuery({queryKey:['earnings',address],enabled:!!MARKET&&!!address&&!!market.data,refetchInterval:20000,queryFn:()=>client.readContract({address:MARKET!,abi:marketAbi,functionName:'earnings',args:[address!]})});
  const walletSqueeks = useQuery({queryKey:['wallet-squeeks',address],enabled:view==='squeeks'&&!!address,staleTime:30000,queryFn:()=>ownedSqueeks(address!)});
  const connected = async()=>{
    if(!address)throw new Error('Connect your wallet first.');
    if(chainId!==11155111)await switchChainAsync({chainId:11155111});
    if(!MARKET||!market.data)throw new Error('The rental protocol is not available.');
    return address;
  };
  const receipt = async(h:Hash)=>{setHash(h);setStatus('Waiting for Sepolia confirmation…');const r=await client.waitForTransactionReceipt({hash:h});if(r.status!=='success')throw new Error('Transaction reverted on Sepolia.');};
  const action = async(fn:()=>Promise<void>)=>{
    setBusy(true);setError('');setHash(undefined);setStatus('Preparing transaction…');
    try{await connected();await fn();setStatus('Confirmed on Sepolia.');await queryClient.invalidateQueries();}
    catch(e){setError(message(e));setStatus('');}finally{setBusy(false);}
  };
  const openWallet = (open?: () => void) => {
    setError('');
    if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && !(window as Window & {ethereum?: unknown}).ethereum) {
      setError('No browser wallet detected. Open this site in a wallet browser or install an Ethereum wallet extension, then refresh.');
      return;
    }
    open?.();
  };
  async function submitList(e:FormEvent){e.preventDefault();await action(async()=>{
    if(owned===undefined)throw new Error('Look up a Squeek you own first.');
    const p=parseUnits(price,18); const lo=Number(min),hi=Number(max);
    if(p<=0n||p>2n**128n-1n||!Number.isInteger(lo)||!Number.isInteger(hi)||lo<1||hi<lo||hi>365)throw new Error('Use a positive SQK price and 1–365 whole days.');
    const owner=await client.readContract({address:NFT,abi:nftAbi,functionName:'ownerOf',args:[owned]});
    if(!same(owner,address))throw new Error('This wallet no longer owns that NFT.');
    setStatus('Approve this Squeek in your wallet…');
    await receipt(await writeContractAsync({address:NFT,abi:nftAbi,functionName:'approve',args:[MARKET!,owned],chainId:11155111}));
    setStatus('Confirm escrow listing in your wallet…');
    await receipt(await writeContractAsync({address:MARKET!,abi:marketAbi,functionName:'list',args:[owned,p,lo,hi],chainId:11155111}));setOwned(undefined);
  });}
  async function lookupNFT(e:FormEvent){e.preventDefault();setError('');setLookupBusy(true);setOwned(undefined);try{if(!address)throw new Error('Connect a wallet to check ownership.');if(!/^\d+$/.test(lookup))throw new Error('Enter a numeric token ID.');const id=BigInt(lookup);const owner=await client.readContract({address:NFT,abi:nftAbi,functionName:'ownerOf',args:[id]});if(!same(owner,address))throw new Error('This Squeek is not in your connected wallet.');setOwned(id);}catch(e){setError(message(e));}finally{setLookupBusy(false);}}
  async function submitRent(){await action(async()=>{
    if(!selected||!ack)throw new Error('Acknowledge the usage limitation.');
    if(!Number.isInteger(days)||days<selected.minDays||days>selected.maxDays)throw new Error('Choose a duration within the listing range.');
    const fresh=await readListing(selected.id);
    if(!fresh.listed||fresh.nonce!==selected.nonce||fresh.pricePerDay!==selected.pricePerDay)throw new Error('The listing changed. Refresh and review it again.');
    const total=selected.pricePerDay*BigInt(days);
    const balance=await client.readContract({address:SQK,abi:tokenAbi,functionName:'balanceOf',args:[address!]});
    if(balance<total)throw new Error('Your wallet does not have enough Sepolia SQK.');
    const allowance=await client.readContract({address:SQK,abi:tokenAbi,functionName:'allowance',args:[address!,MARKET!]});
    if(allowance<total){setStatus('Approve the exact SQK payment in your wallet…');await receipt(await writeContractAsync({address:SQK,abi:tokenAbi,functionName:'approve',args:[MARKET!,total],chainId:11155111}));}
    setStatus('Confirm your rental in your wallet…');await receipt(await writeContractAsync({address:MARKET!,abi:marketAbi,functionName:'rent',args:[selected.id,days,total,selected.nonce],chainId:11155111}));setSelected(undefined);
  });}
  const all = records.data||[];
  const available=all.filter(l=>l.listed&&Number(l.expiresAt)<=now);
  const mine=all.filter(l=>same(l.owner,address));
  const rentals=all.filter(l=>same(l.renter,address)&&Number(l.expiresAt)>now);
  const visible=(view==='browse'?available:view==='squeeks'?mine:rentals).filter(l=>!search||l.id.toString().includes(search.trim())).filter(l=>!daysFilter||(Number(daysFilter)>=l.minDays&&Number(daysFilter)<=l.maxDays)).sort((a,b)=>sort==='low'?(a.pricePerDay<b.pricePerDay?-1:1):sort==='high'?(a.pricePerDay>b.pricePerDay?-1:1):(a.nonce>b.nonce?-1:1));
  const empty=!visible.length;
  const ready=!!MARKET&&!!market.data;
  const titles={browse:['THE RENTAL MARKET','Find your next little resident.'],squeeks:['YOUR COLLECTION','Make room for possibilities.'],rentals:['YOUR BORROWED BURROW','Good company. On your terms.'],earnings:['YOUR EARNINGS','Small paws. Your proceeds.']};
  return <>
    <div className="testnet-strip"><span className="live-dot"/> SEPOLIA TESTNET <span className="strip-divider">/</span> A little experiment. No mainnet assets.</div>
    <header className="header shell app-header"><Link href="/" className="wordmark"><Brand/><BrandName/></Link>
      <nav className="primary-nav" aria-label="App navigation">{tabs.map(([key,url,label])=><Link key={key} href={url} aria-current={key===view?'page':undefined}>{label}</Link>)}<Link href="/docs/">Docs <ArrowUpRight size={12}/></Link></nav>
      <ConnectButton.Custom>{({account,chain,openAccountModal,openChainModal,openConnectModal,mounted})=><button type="button" className="wallet-button" disabled={!mounted} onClick={!account?()=>openWallet(openConnectModal):chain?.unsupported?openChainModal:openAccountModal}><Wallet size={16}/>{!account?'Connect wallet':chain?.unsupported?'Wrong network':account.displayName}<span className="wallet-light"/></button>}</ConnectButton.Custom>
    </header>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <main className="shell app-main" id="main-content">
      <section className="market-section" id="market"><div className="section-heading"><div><div className="eyebrow">{titles[view][0]}</div><h1 className="app-page-title">{titles[view][1]}</h1></div><div className="chain-pill"><span className="live-dot"/> Ethereum Sepolia <ArrowUpRight size={14}/></div></div>
        <div className="compatibility"><CircleHelp size={18}/><p><b>Usage registry only.</b> Rentals work with apps that integrate VeilHub. Squeekchain mining, staking and owner-only claims do not recognize rented usage rights. Mining rewards are not included.</p><a href="https://docs.squeekchain.com/developers/mining/" target="_blank" rel="noreferrer" aria-label="Read SqueekMining compatibility documentation"><ArrowUpRight size={18}/></a></div>
        {!MARKET&&<div className="deployment-note"><span className="status-dot"/> Awaiting Sepolia deployment. Live listings will appear after the protocol is deployed.</div>}
        {market.data?.paused&&<div className="deployment-note">New listings and rentals are paused. Withdrawals and earnings claims remain available.</div>}
        {isConnected&&chainId!==11155111&&<div className="deployment-note">Your wallet is on another network. <button onClick={()=>switchChainAsync({chainId:11155111}).catch(e=>setError(message(e)))}>Switch to Sepolia</button></div>}
        {(error||status)&&<div className={`transaction-status ${error?'error':''}`} role={error?'alert':'status'}>{busy&&<LoaderCircle className="spin" size={16}/>}<span>{error||status}</span>{hash&&<a href={`https://eth-sepolia.blockscout.com/tx/${hash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}<button aria-label="Dismiss status" disabled={busy} onClick={()=>{setError('');setStatus('')}}><X size={16}/></button></div>}
        {view==='squeeks'&&<section className="listing-builder"><div><div className="eyebrow">YOUR WALLET COLLECTION</div><h3>Choose a Squeek to list.</h3><p>Your Squeeks are discovered from the official NFT’s on-chain transfers and verified against its current owner. Choose one below; you do not need to know its token ID.</p><p className="fine-print">This app deposits the NFT into escrow. Squeekchain’s mining and owner-only rewards will not recognize the renter.</p></div><div>
          {!address?<button type="button" className="button primary" onClick={()=>openWallet(openConnectModal)}>Connect wallet <ArrowUpRight size={16}/></button>:walletSqueeks.isLoading?<p className="fine-print"><LoaderCircle className="spin" size={16}/> Finding Squeeks in your wallet on Sepolia…</p>:walletSqueeks.isError?<p role="alert" className="error">Could not load your Squeeks from Sepolia. Try refreshing or use the manual lookup below.</p>:walletSqueeks.data?.length?<div className="wallet-squeek-list">{walletSqueeks.data.map(id=><WalletSqueek key={id.toString()} id={id} selected={owned===id} onSelect={()=>setOwned(id)}/>)}</div>:<div className="wallet-empty"><p>No Squeeks are currently in this wallet on Sepolia.</p><p>The official NFT’s mint phase is controlled by Squeekchain. VeilHub has no NFT or SQK faucet; a Sepolia ETH faucet only provides gas.</p><a href="https://docs.squeekchain.com/squeeks/minting/" target="_blank" rel="noreferrer">Official Squeek mint information ↗</a> · <a href="https://ethereum.org/developers/docs/networks/#sepolia" target="_blank" rel="noreferrer">Sepolia ETH faucets ↗</a></div>}
          <details className="manual-lookup"><summary>Have a token ID? Check it manually</summary><form className="lookup-form" onSubmit={lookupNFT}><label htmlFor="token-id">Squeek token ID</label><div><input id="token-id" inputMode="numeric" placeholder="e.g. 42" value={lookup} onChange={e=>setLookup(e.target.value)}/><button className="button secondary" disabled={!address||lookupBusy}>{lookupBusy?'Checking…':'Check ownership'}<Search size={15}/></button></div></form></details>
          {owned!==undefined&&<form className="list-form" onSubmit={submitList}><div className="verified"><Check size={15}/> Squeek #{owned.toString()} belongs to your wallet.</div><div className="form-row"><label>Price / day (SQK)<input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" required/></label><label>Min days<input type="number" min="1" max="365" value={min} onChange={e=>setMin(e.target.value)} required/></label><label>Max days<input type="number" min={min} max="365" value={max} onChange={e=>setMax(e.target.value)} required/></label></div><p className="fine-print">Protocol fee: {market.data?market.data.fee/100:'—'}%, locked for this listing. NFT ownership on chain moves to escrow. Only you can withdraw after expiry. No early cancellation or refunds.</p><button className="button primary" disabled={busy||!ready||market.data?.paused}>Approve & list <ArrowUpRight size={16}/></button></form>}
        </div></section>}
        {view==='earnings'?<section className="earnings-panel"><div className="earnings-icon"><Coins size={30}/></div><div className="eyebrow">READY TO COME HOME</div><h3>{earnings.data!==undefined?amount(earnings.data):'—'} <span>SQK</span></h3><p>Your share of rental payments, held in the contract until you claim.<br/>The protocol cannot withdraw your balance.</p><button className="button primary" disabled={!ready||!address||busy||!earnings.data} onClick={()=>action(async()=>{await receipt(await writeContractAsync({address:MARKET!,abi:marketAbi,functionName:'claim',chainId:11155111}));})}>Claim earnings <ArrowUpRight size={17}/></button>{earnings.isError&&<p role="alert">Could not read earnings. Check your RPC connection.</p>}<span className="fine-print">Claims stay open even when the marketplace is paused.</span></section>:<>
          <div className="toolbar"><div className="filter-tabs"><button className="active">{view==='browse'?'Available Squeeks':view==='squeeks'?'In escrow':'Active rentals'} <span>{ready&&records.data?visible.length:'—'}</span></button></div><div className="toolbar-controls"><label className="search-field"><Search size={16}/><input aria-label="Search by token ID" placeholder="Search token ID…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label><button className={`icon-button ${filters?'selected':''}`} aria-label="Toggle filters" aria-expanded={filters} onClick={()=>setFilters(!filters)}><SlidersHorizontal size={18}/></button><button className="icon-button" aria-label="Refresh on-chain data" onClick={()=>queryClient.invalidateQueries()}><RefreshCw size={17} className={market.isFetching||records.isFetching?'spin':''}/></button></div></div>
          {filters&&<div className="filters"><label>Sort by<select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="newest">Newest listing</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label><label>Fits a stay of (days)<input type="number" min="1" max="365" placeholder="Any duration" value={daysFilter} onChange={e=>{setDaysFilter(e.target.value);setPage(1)}}/></label></div>}
          {market.isError||records.isError?<div className="empty-state"><RefreshCw/><h3>We couldn’t reach the burrow.</h3><p>{message(market.error||records.error)}</p><button className="button secondary" onClick={()=>queryClient.invalidateQueries()}>Try again</button></div>:MARKET&&(market.isLoading||records.isLoading)?<div className="empty-state"><LoaderCircle className="spin"/><h3>Reading Sepolia…</h3><p>Fetching real listings directly from the contract.</p></div>:view!=='browse'&&!address?<div className="empty-state"><Wallet/><h3>Your burrow is one connection away.</h3><p>Connect a wallet to see your {view==='squeeks'?'escrowed Squeeks':'active rentals'}.</p><button className="button primary" onClick={()=>openWallet(openConnectModal)}>Connect wallet <ArrowUpRight size={16}/></button></div>:empty?<div className="empty-state"><div className="empty-icon"><House size={32}/><span>z z</span></div><h3>{search||daysFilter?'No Squeeks match this stay.':view==='browse'?'The burrow is quiet.':view==='squeeks'?'No Squeeks checked in yet.':'No temporary roommates. Yet.'}</h3><p>{search||daysFilter?'Try another token ID or duration.':view==='browse'?'When a holder lists a Squeek, you’ll find it right here.':view==='squeeks'?'Choose a Squeek from your wallet collection above.':'Explore the market to find your next Squeek.'}</p>{view==='browse'?<Link className="button secondary" href="/app/squeeks/">Be the first to list <ArrowUpRight size={16}/></Link>:view==='rentals'?<Link className="button secondary" href="/app/">Explore listings <ArrowRight size={16}/></Link>:null}<small>Real on-chain records. No sample listings.</small></div>:<div className="cards">{visible.slice(0,page*12).map(l=><ListingCard key={l.id.toString()} listing={l} now={now} view={view} busy={busy} canRent={ready&&!!address&&!market.data?.paused&&!same(l.owner,address)} onRent={()=>{setSelected(l);setDays(l.minDays);setAck(false)}} onDelist={()=>action(async()=>{await receipt(await writeContractAsync({address:MARKET!,abi:marketAbi,functionName:'delist',args:[l.id],chainId:11155111}));})} onWithdraw={()=>action(async()=>{await receipt(await writeContractAsync({address:MARKET!,abi:marketAbi,functionName:'withdraw',args:[l.id],chainId:11155111}));})}/>)}</div>}
          {visible.length>page*12&&<button className="button secondary load-more" onClick={()=>setPage(page+1)}>Show more Squeeks</button>}
        </>}
        <div className="market-footnote"><span><span className="live-dot"/>{market.data?`On-chain · block ${market.data.block.toLocaleString()}`:MARKET?`Sepolia contract · ${short(MARKET)}`:'Deployment pending'}</span><span>One listing. One stay. A clear way home.</span></div>
      </section>

    </main>
    <footer className="shell"><div className="footer-top"><Link href="/" className="wordmark"><BrandName/></Link><span>An independent experiment in the Squeek ecosystem.</span><a href="https://docs.squeekchain.com/" target="_blank" rel="noreferrer">Squeekchain docs <ArrowUpRight size={14}/></a></div><div className="addresses"><span>Sepolia · 11155111</span><a href={explorer(NFT)} target="_blank" rel="noreferrer">Squeek NFT <code>{NFT}</code></a><a href={explorer(SQK)} target="_blank" rel="noreferrer">SQK <code>{SQK}</code></a>{MARKET?<a href={explorer(MARKET)} target="_blank" rel="noreferrer">Rental <code>{MARKET}</code></a>:<span>Rental · Not deployed</span>}</div><div className="footer-bottom"><span>Built for little paws, on testnet.</span><span>NFT escrow · No mainnet use · No mining reward sharing</span></div></footer>
    {selected&&<dialog ref={dialogRef} className="rental-dialog" aria-labelledby="rental-title" onCancel={e=>{e.preventDefault();if(!busy)setSelected(undefined)}}><div className="dialog-content"><button className="dialog-close icon-button" aria-label="Close rental" disabled={busy} onClick={()=>setSelected(undefined)}><X/></button><div className="eyebrow">CHECK INTO THE BURROW</div><h2 id="rental-title">Rent Squeek #{selected.id.toString()}</h2><p>Temporary usage rights. The NFT stays in escrow.</p><label>Length of stay (days)<input autoFocus type="number" min={selected.minDays} max={selected.maxDays} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><span className="fine-print">{selected.minDays}–{selected.maxDays} days · {amount(selected.pricePerDay)} SQK / day</span><div className="quote"><span>Total payment</span><strong>{Number.isInteger(days)&&days>0?amount(selected.pricePerDay*BigInt(days)):'—'} SQK</strong><span>Owner / protocol split</span><b>{100-selected.feeBps/100}% / {selected.feeBps/100}%</b></div><label className="ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/><span>I understand this grants rights only in apps integrating VeilHub. It does not grant Squeekchain mining/staking eligibility or rewards. Payment is non-refundable, with no early cancellation.</span></label>{(error||status)&&<p className={error?'error':'fine-print'} role={error?'alert':'status'}>{error||status}</p>}<button className="button primary" disabled={!ack||busy||!Number.isInteger(days)||days<selected.minDays||days>selected.maxDays} onClick={submitRent}>{busy?<LoaderCircle className="spin" size={17}/>:<KeyRound size={17}/>}Approve SQK & rent</button><span className="fine-print">You’ll confirm each required transaction in your wallet.</span></div></dialog>}
  </>;
}

function WalletSqueek({id,selected,onSelect}:{id:bigint;selected:boolean;onSelect:()=>void}) {
  const metadata=useQuery({queryKey:['metadata',id.toString()],staleTime:60000,queryFn:async()=>{
    const uri=await client.readContract({address:NFT,abi:nftAbi,functionName:'tokenURI',args:[id]});
    if(!uri.startsWith('data:application/json;base64,'))throw new Error('Unsupported metadata format');
    const data=JSON.parse(atob(uri.slice(29))) as {image?:string};
    if(!data.image?.startsWith('data:image/svg+xml;base64,'))throw new Error('Unsupported image format');
    return data;
  }});
  return <button type="button" className={`wallet-squeek ${selected?'selected':''}`} onClick={onSelect} aria-pressed={selected}>
    {metadata.data?.image?<img src={metadata.data.image} alt="" loading="lazy"/>:<span className="wallet-squeek-placeholder">{metadata.isLoading?'Loading art…':'Squeek'}</span>}
    <span>Squeek #{id.toString()} {selected?<Check size={16}/>:<ArrowRight size={16}/>}</span>
  </button>;
}

function ListingCard({listing:l,now,view,busy,canRent,onRent,onDelist,onWithdraw}:{listing:Listing;now:number;view:View;busy:boolean;canRent:boolean;onRent:()=>void;onDelist:()=>void;onWithdraw:()=>void}) {
  const metadata=useQuery({queryKey:['metadata',l.id.toString()],staleTime:60000,queryFn:async()=>{
    const uri=await client.readContract({address:NFT,abi:nftAbi,functionName:'tokenURI',args:[l.id]});
    if(!uri.startsWith('data:application/json;base64,'))throw new Error('Unsupported metadata format');
    const data=JSON.parse(atob(uri.slice(29))) as {image?:string;name?:string};
    // Render SVG only in an isolated image, never as HTML.
    if(!data.image?.startsWith('data:image/svg+xml;base64,'))throw new Error('Unsupported image format');
    return data;
  }});
  const active=Number(l.expiresAt)>now;
  const remaining=Math.max(0,Number(l.expiresAt)-now);
  return <article className="squeek-card"><div className="nft-art">{metadata.data?.image?<img src={metadata.data.image} alt={`On-chain artwork for Squeek #${l.id}`} loading="lazy"/>:<div className="metadata-unavailable">{metadata.isLoading?'Loading on-chain art…':'Artwork unavailable'}</div>}<span className="nft-badge">{active?'RENTED':l.listed?'AVAILABLE':'DELISTED'}</span></div><div className="card-body"><div className="card-title"><h3>Squeek #{l.id.toString()}</h3><a href={`${explorer(NFT)}?tab=token_transfers&token_id=${l.id}`} target="_blank" rel="noreferrer" aria-label={`View Squeek ${l.id} on explorer`}><ArrowUpRight size={18}/></a></div><p className="owner-line">Listed by {short(l.owner)}</p><div className="card-price"><strong>{amount(l.pricePerDay)} <small>SQK / day</small></strong><span><Clock3 size={13}/>{l.minDays}–{l.maxDays} days</span></div>{active&&<p className="time-left"><Clock3 size={14}/>{Math.floor(remaining/86400)}d {Math.floor(remaining%86400/3600)}h {Math.floor(remaining%3600/60)}m left<br/><small>Ends {new Date(Number(l.expiresAt)*1000).toLocaleString()}</small></p>}{view==='browse'?<button className="button primary" disabled={!canRent||busy} onClick={onRent}>Rent Squeek <ArrowRight size={16}/></button>:view==='squeeks'?<div className="card-actions">{l.listed&&<button className="button secondary" disabled={busy||active} onClick={onDelist}>Delist</button>}<button className="button primary" disabled={busy||active} onClick={onWithdraw}>{active?'In active rental':'Withdraw NFT'}</button></div>:<div className="usage-active"><Check size={16}/>Temporary usage is active</div>}</div></article>;
}
