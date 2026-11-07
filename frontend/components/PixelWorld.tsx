'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,ArrowUpRight,Compass,Gamepad2,Map,MapPin,RotateCcw,Sparkles,Coins,X} from 'lucide-react';
import AppShell from './AppShell';
import {TILE,WORLD_W,WORLD_H,VIEW_W,VIEW_H,ZONES,canStand,cameraFor,drawWorld,nearestZone,type Point,type ZoneId} from '../lib/pixel-world';
import './pixel-world.css';

type Direction='up'|'down'|'left'|'right';
const START={x:25.5*TILE,y:16.5*TILE};
const QUESTS:ZoneId[]=['wheel','staking','rent','trade'];
const validIds=new Set<ZoneId>(['guide','wheel','staking','rent','trade','mint']);
const MOVE_KEYS:Record<string,Direction>={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
const LABELS:Record<ZoneId,string>={guide:'Pip the Guide',wheel:'Wheelhouse',staking:'Staking Grove',rent:'Rental Burrow',trade:'Trade Market',mint:'Test Claim Gate'};
function advance(p:Point,dx:number,dy:number){let x=p.x,y=p.y;if(canStand(x+dx,y))x+=dx;if(canStand(x,y+dy))y+=dy;return {x,y}}
function compass(from:Point,to:Point){const dx=to.x-from.x,dy=to.y-from.y;const deg=Math.atan2(dy,dx)*180/Math.PI;return {angle:deg,distance:Math.round(Math.hypot(dx,dy)/TILE)}}
export default function PixelWorld(){
  const canvas=useRef<HTMLCanvasElement>(null);
  const player=useRef<Point>({...START});
  const nearRef=useRef<ZoneId|undefined>('guide');
  const keys=useRef(new Set<Direction>());
  const dialogueRef=useRef<ZoneId|undefined>(undefined);
  const stakedRef=useRef(false);
  const visitedRef=useRef(new Set<ZoneId>());
  const facing=useRef('down');
  const [position,setPosition]=useState<Point>(START);
  const [near,setNear]=useState<ZoneId|undefined>('guide');
  const [dialogue,setDialogue]=useState<ZoneId>();
  const [staked,setStaked]=useState(false);
  const [visited,setVisited]=useState<ZoneId[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [target,setTarget]=useState<ZoneId>('wheel');
  const [notice,setNotice]=useState('');
  useEffect(()=>{try{const ids=JSON.parse(localStorage.getItem('veilhub-world-visited-v1')||'[]');if(Array.isArray(ids)){const clean=ids.filter((id):id is ZoneId=>validIds.has(id));visitedRef.current=new Set(clean);setVisited(clean)}}catch{}setLoaded(true)},[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem('veilhub-world-visited-v1',JSON.stringify(visited))}catch{}},[visited,loaded]);
  useEffect(()=>{dialogueRef.current=dialogue;keys.current.clear()},[dialogue]);
  useEffect(()=>{stakedRef.current=staked},[staked]);
  const interact=useCallback(()=>{
    const id=nearRef.current;
    if(!id){setNotice('Walk closer to a glowing marker.');return}
    setNotice('');setDialogue(id);
    if(!visitedRef.current.has(id)){
      visitedRef.current.add(id);
      setVisited([...visitedRef.current]);
      if(QUESTS.includes(id))setNotice(`${LABELS[id]} discovered · +50 arcade points`);
      if(target===id){const next=QUESTS.find(q=>!visitedRef.current.has(q));if(next)setTarget(next)}
    }
  },[target]);
  useEffect(()=>{
    const down=(event:KeyboardEvent)=>{
      const node=event.target as HTMLElement;
      if(node.closest('input,textarea,select,[contenteditable="true"]'))return;
      const key=event.key.toLowerCase();
      if(key==='escape'&&dialogueRef.current){setDialogue(undefined);return}
      if(key==='e'&&!dialogueRef.current){event.preventDefault();interact();return}
      if(dialogueRef.current)return;
      const direction=MOVE_KEYS[key];
      if(direction){event.preventDefault();keys.current.add(direction);facing.current=direction}
    };
    const up=(event:KeyboardEvent)=>{const direction=MOVE_KEYS[event.key.toLowerCase()];if(direction)keys.current.delete(direction)};
    const blur=()=>keys.current.clear();
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)};
  },[interact]);
  useEffect(()=>{
    const context=canvas.current?.getContext('2d');if(!context)return;
    let frame=0,last=performance.now(),lastHud=0;
    const render=(now:number)=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!dialogueRef.current){
        const dx=Number(keys.current.has('right'))-Number(keys.current.has('left'));
        const dy=Number(keys.current.has('down'))-Number(keys.current.has('up'));
        if(dx||dy){const scale=84*dt/(dx&&dy?Math.SQRT2:1);player.current=advance(player.current,dx*scale,dy*scale)}
      }
      const nearby=nearestZone(player.current)?.id;
      if(nearRef.current!==nearby){nearRef.current=nearby;setNear(nearby)}
      drawWorld(context,player.current,cameraFor(player.current),now,visitedRef.current,stakedRef.current,facing.current);
      if(now-lastHud>100){setPosition({...player.current});lastHud=now}
      frame=requestAnimationFrame(render);
    };
    frame=requestAnimationFrame(render);return()=>cancelAnimationFrame(frame);
  },[]);
  const press=(direction:Direction)=>{if(dialogueRef.current)return;keys.current.add(direction);facing.current=direction;const delta={up:[0,-9],down:[0,9],left:[-9,0],right:[9,0]}[direction];player.current=advance(player.current,delta[0],delta[1])};
  const release=(direction:Direction)=>keys.current.delete(direction);
  const zone=dialogue?ZONES.find(z=>z.id===dialogue):undefined;
  const destination=ZONES.find(z=>z.id===target)!;
  const bearing=compass(position,destination);
  const explored=QUESTS.filter(q=>visited.includes(q)).length;
  const arcadePoints=explored*50+(explored===QUESTS.length?200:0);
  const fastTravel=(id:ZoneId)=>{
    if(!visitedRef.current.has(id)||!QUESTS.includes(id))return;
    const location=ZONES.find(z=>z.id===id);
    if(!location)return;
    const arrival={x:location.x,y:location.y+12};
    if(!canStand(arrival.x,arrival.y))return;
    player.current=arrival;
    nearRef.current=id;
    setNear(id);
    setPosition(arrival);
    setTarget(id);
    setDialogue(undefined);
    setNotice(`Fast travelled to ${location.name}. Press E to explore.`);
  };
  const resetVisit=()=>{visitedRef.current=new Set();setVisited([]);setTarget('wheel');setNotice('Map discoveries reset.')};
  return <AppShell active="arcade"><div className="pixel-head"><div><span className="eyebrow">VEILHUB / PIXEL WORLD</span><h1>Little paws. <span>Big map.</span></h1><p>Roam a tiny Squeek world, meet the locals and explore wheel work, staking, rentals and NFT trades.</p></div><div className="pixel-local"><span className="pixel-live"/> A browser adventure · No SQK rewards or wallet transactions</div></div>
    <div className="pixel-shell"><section className="pixel-main" aria-label="Explore the Squeek world"><div className="pixel-topbar"><div><span className="pixel-top-icon">✦</span><strong>SQUEEK NEIGHBORHOOD</strong><small>FREE ROAM / LOCAL</small></div><div><span>PLACES DISCOVERED</span><strong>{explored} / {QUESTS.length}</strong></div></div>
      <div className="pixel-viewport"><canvas ref={canvas} width={VIEW_W} height={VIEW_H} role="img" aria-label="Pixel world map. Move with WASD, arrow keys or touch controls. Interact near glowing markers."/><div className="pixel-viewport-corner top-left">◈ WORLD 01</div><div className="pixel-viewport-corner bottom-right">X {Math.floor(position.x/TILE).toString().padStart(2,'0')} · Y {Math.floor(position.y/TILE).toString().padStart(2,'0')}</div>{near&&<button className="pixel-interact-prompt" onClick={interact}><kbd>E</kbd> {near==='guide'?'Talk to Pip':`Explore ${LABELS[near]}`} <ArrowUpRight size={13}/></button>}</div>
      <div className="pixel-control-row"><div className="pixel-controls"><span>MOVE</span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><em>or</em><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd><span className="pixel-control-divider"/><span>INTERACT</span><kbd>E</kbd></div><button onClick={interact} className="pixel-action" disabled={!near}>Interact <Sparkles size={15}/></button></div>
      <div className="pixel-touch"><div><button aria-label="Move up" onPointerDown={()=>press('up')} onPointerUp={()=>release('up')} onPointerCancel={()=>release('up')} onPointerLeave={()=>release('up')}><ArrowUp/></button><div><button aria-label="Move left" onPointerDown={()=>press('left')} onPointerUp={()=>release('left')} onPointerCancel={()=>release('left')} onPointerLeave={()=>release('left')}><ArrowLeft/></button><button aria-label="Move down" onPointerDown={()=>press('down')} onPointerUp={()=>release('down')} onPointerCancel={()=>release('down')} onPointerLeave={()=>release('down')}><ArrowDown/></button><button aria-label="Move right" onPointerDown={()=>press('right')} onPointerUp={()=>release('right')} onPointerCancel={()=>release('right')} onPointerLeave={()=>release('right')}><ArrowRight/></button></div></div><button className="pixel-touch-interact" onClick={interact} disabled={!near}>INTERACT<br/><small>E</small></button></div>
      <div className="pixel-caption"><span>✦ Follow the stone paths. Glowing markers reveal each location.</span><span>{notice||'Your discoveries are saved in this browser.'}</span></div>
    </section>
    <aside className="pixel-sidebar"><div className="pixel-map-card"><div className="pixel-card-heading"><span><Map size={15}/> WORLD MAP</span><b>01 / 01</b></div><div className="pixel-minimap"><div className="pixel-map-road horizontal"/><div className="pixel-map-road vertical"/>{ZONES.filter(z=>z.id!=='guide').map(z=><button key={z.id} aria-label={`Track ${z.name}`} title={z.name} className={`pixel-map-dot ${target===z.id?'tracked':''} ${visited.includes(z.id)?'seen':''}`} style={{left:`${z.x/WORLD_W*100}%`,top:`${z.y/WORLD_H*100}%`,background:z.accent}} onClick={()=>setTarget(z.id)}/>)}<span className="pixel-map-player" style={{left:`${position.x/WORLD_W*100}%`,top:`${position.y/WORLD_H*100}%`}}/></div><div className="pixel-compass"><Compass size={18}/><div><small>TRACKING {destination.name.toUpperCase()}</small><strong>{bearing.distance} tiles away</strong></div><span style={{transform:`rotate(${bearing.angle}deg)`}}>➜</span></div></div>
      <div className="pixel-quest-card"><div className="pixel-card-heading"><span><MapPin size={15}/> DISCOVER THE WORLD</span><b>{explored}/{QUESTS.length}</b></div><p>Walk to each district and press E at its marker.</p><div className="pixel-quests">{QUESTS.map((id,i)=>{const item=ZONES.find(z=>z.id===id)!;return <button key={id} className={`${target===id?'active':''} ${visited.includes(id)?'complete':''}`} onClick={()=>setTarget(id)}><span>{visited.includes(id)?'✓':String(i+1).padStart(2,'0')}</span><div><strong>{item.name}</strong><small>{id==='wheel'?'Play the wheel':id==='staking'?'Explore power':id==='rent'?'Browse stays':'Explore sales'}</small></div><ArrowRight size={14}/></button>})}</div><button className="pixel-reset" onClick={resetVisit}><RotateCcw size={13}/> Reset discoveries</button></div>
      <div className="pixel-reward-card"><div className="pixel-card-heading"><span><Coins size={15}/> ARCADE PASSPORT</span><b>LOCAL ONLY</b></div><div className="pixel-points"><strong>{arcadePoints}</strong><span>EXPLORER POINTS</span></div><div className="pixel-stamps" aria-label={`${explored} of ${QUESTS.length} district stamps earned`}>{QUESTS.map(id=><span key={id} className={visited.includes(id)?'earned':''} title={ZONES.find(z=>z.id===id)?.name}>{visited.includes(id)?'✦':'◇'}</span>)}</div><p>Each new district earns 50 points. Discover all four for a 200 point bonus.</p>{explored===QUESTS.length&&<div className="pixel-complete">✦ Neighborhood explorer complete</div>}{explored>0&&<div className="pixel-travel"><span>FAST TRAVEL · UNLOCKED PLACES</span><div>{QUESTS.filter(id=>visited.includes(id)).map(id=><button key={id} onClick={()=>fastTravel(id)}><MapPin size={11}/>{ZONES.find(z=>z.id===id)?.name}</button>)}</div></div>}</div>
      <div className="pixel-note"><Gamepad2 size={18}/><div><strong>Play first. Learn as you go.</strong><p>This world uses fictional arcade points. Real Squeekchain rewards require official on-chain staking; VeilHub rentals have separate usage rights.</p><Link href="/docs/security/">Read the limits <ArrowUpRight size={13}/></Link></div></div>
    </aside></div>
    {zone&&<div className="pixel-dialog-backdrop" onClick={()=>setDialogue(undefined)}><section role="dialog" aria-modal="true" aria-labelledby="pixel-dialog-title" className="pixel-dialog" onClick={event=>event.stopPropagation()} style={{'--zone-accent':zone.accent} as CSSProperties}><button className="pixel-dialog-close" aria-label="Close dialogue" onClick={()=>setDialogue(undefined)}><X size={18}/></button><div className="pixel-dialog-portrait">{zone.id==='guide'?'🐹':zone.id==='wheel'?'✦':zone.id==='staking'?'◇':zone.id==='rent'?'⌂':zone.id==='trade'?'◈':'☆'}</div><span className="pixel-dialog-kicker">{zone.id==='guide'?'LOCAL GUIDE':`DISCOVERED / ${zone.short}`}</span><h2 id="pixel-dialog-title">{zone.name}</h2><p>{zone.id==='guide'?'Welcome to the neighborhood! Follow the paths to the Wheelhouse, Staking Grove, Rental Burrow and Trade Market. The glowing markers open each stop.':zone.id==='wheel'?'The wheel turns physical work into Squeekchain blocks. Play Wheel Circuit here for local arcade points; its pulses never create SQK.':zone.id==='staking'?'In the real protocol, stakers deposit Squeeks or SQK into Squeekchain’s official contract. This badge is only a local visual marker for the pixel world.':zone.id==='rent'?'VeilHub rental listings escrow real testnet Squeeks. Renters pay SQK for a fixed term and receive an independent usage record, not staking rights.':zone.id==='trade'?'Trade Market connects to real Sepolia listings. Sellers escrow a Squeek NFT; buyers pay the listed SQK price in an on-chain transaction.':'Eligible wallets can claim a test Squeek on Squeekchain’s official Sepolia page. This world does not mint assets.'}</p><div className="pixel-dialog-actions">{zone.id==='wheel'&&<Link className="button primary" href="/app/arcade/wheel/">Play Wheel Circuit <ArrowRight size={15}/></Link>}{zone.id==='wheel'&&<Link className="button secondary" href="/app/mining/">Open Mining Lab <ArrowUpRight size={15}/></Link>}{zone.id==='staking'&&<><button className="button primary" onClick={()=>setStaked(value=>!value)}>{staked?'Remove virtual badge':'Place virtual badge'} <Sparkles size={15}/></button><Link className="button secondary" href="/app/staking/">Open Staking Lab <ArrowUpRight size={15}/></Link></>}{zone.id==='rent'&&<Link className="button primary" href="/app/">Browse rentals <ArrowRight size={15}/></Link>}{zone.id==='trade'&&<Link className="button primary" href="/app/trade/">Browse NFT trades <ArrowRight size={15}/></Link>}{zone.id==='mint'&&<a className="button primary" href="https://sepolia.squeekchain.com/mint" target="_blank" rel="noreferrer">Official test claim <ArrowUpRight size={15}/></a>}{zone.id==='guide'&&<button className="button primary" onClick={()=>setDialogue(undefined)}>Let’s explore <ArrowRight size={15}/></button>}</div><small>PIXEL WORLD · LOCAL INTERACTION ONLY</small></section></div>}
  </AppShell>;
}
