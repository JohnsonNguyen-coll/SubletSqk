'use client';

import {useCallback, useEffect, useReducer, useState} from 'react';
import Link from 'next/link';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bolt, CircleHelp, Heart, RotateCcw, Trophy} from 'lucide-react';
import AppShell from './AppShell';
import './wheel-arcade.css';

const COLS=12;
const ROWS=8;
const DURATION=60;
const START={x:1,y:4};
const STATION={x:10,y:6};
const WALLS=[{x:4,y:1},{x:4,y:2},{x:4,y:3},{x:7,y:4},{x:8,y:4},{x:4,y:6}];
const SPAWNS=[{x:2,y:1},{x:9,y:1},{x:6,y:2},{x:2,y:6},{x:9,y:5},{x:6,y:6},{x:1,y:2},{x:10,y:2},{x:5,y:4},{x:7,y:1},{x:3,y:5},{x:10,y:7},{x:1,y:7},{x:5,y:7},{x:8,y:2}];
const HAZARD_PATHS=[
  [{x:6,y:1},{x:7,y:1},{x:8,y:1},{x:8,y:2},{x:8,y:3},{x:7,y:3},{x:6,y:3},{x:6,y:2}],
  [{x:2,y:5},{x:3,y:5},{x:3,y:6},{x:3,y:7},{x:2,y:7},{x:1,y:7},{x:1,y:6},{x:1,y:5}]
];
type Point={x:number;y:number};
type Phase='ready'|'playing'|'ended';
type Direction='up'|'down'|'left'|'right';
type Game={phase:Phase;player:Point;spark:Point;spawnIndex:number;tick:number;time:number;hearts:number;work:number;score:number;combo:number;staked:boolean;invulnerable:number};
type Action={type:'START'|'RESET'|'TICK'|'STAKE'}|{type:'MOVE';direction:Direction};
const initial:Game={phase:'ready',player:START,spark:SPAWNS[0],spawnIndex:0,tick:0,time:DURATION,hearts:3,work:0,score:0,combo:0,staked:false,invulnerable:0};
const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
const atStation=(p:Point)=>Math.abs(p.x-STATION.x)+Math.abs(p.y-STATION.y)<=1;
const hazardAt=(tick:number)=>HAZARD_PATHS.map((path,i)=>path[(tick+i*3)%path.length]);
const blocked=(p:Point)=>p.x<0||p.x>=COLS||p.y<0||p.y>=ROWS||WALLS.some(w=>same(w,p));
function hit(game:Game):Game{
  if(game.invulnerable>0)return game;
  const hearts=game.hearts-1;
  return {...game,player:START,hearts,combo:0,invulnerable:4,phase:hearts<=0?'ended':game.phase};
}
function reducer(game:Game,action:Action):Game{
  if(action.type==='RESET')return {...initial};
  if(action.type==='START')return {...initial,phase:'playing'};
  if(game.phase!=='playing')return game;
  if(action.type==='STAKE')return atStation(game.player)?{...game,staked:!game.staked}:game;
  if(action.type==='TICK'){
    const tick=game.tick+1;
    const time=game.time-(tick%2===0?1:0);
    if(time<=0)return {...game,tick,time:0,phase:'ended'};
    const next={...game,tick,time,invulnerable:Math.max(0,game.invulnerable-1)};
    return hazardAt(tick).some(h=>same(h,next.player))?hit(next):next;
  }
  if(action.type!=='MOVE')return game;
  const delta:Point=({up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}} as Record<Direction,Point>)[action.direction];
  const player={x:game.player.x+delta.x,y:game.player.y+delta.y};
  if(blocked(player))return game;
  let next={...game,player};
  if(hazardAt(game.tick).some(h=>same(h,player)))next=hit(next);
  if(next.phase==='ended'||!same(next.player,next.spark))return next;
  const combo=Math.min(next.combo+1,5);
  let spawnIndex=next.spawnIndex;
  let spark=next.spark;
  for(let i=0;i<SPAWNS.length;i++){
    spawnIndex=(spawnIndex+1)%SPAWNS.length;
    const candidate=SPAWNS[spawnIndex];
    if(!same(candidate,next.player)&&!same(candidate,STATION)&&!hazardAt(next.tick).some(h=>same(h,candidate))){spark=candidate;break;}
  }
  return {...next,spark,spawnIndex,work:next.work+1,score:next.score+5*combo*(next.staked?2:1),combo};
}
const pos=(p:Point)=>({left:`${(p.x+.5)/COLS*100}%`,top:`${(p.y+.5)/ROWS*100}%`});
const cell=(p:Point)=>({left:`${p.x/COLS*100}%`,top:`${p.y/ROWS*100}%`,width:`${100/COLS}%`,height:`${100/ROWS}%`});
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

export default function WheelArcade(){
  const [game,dispatch]=useReducer(reducer,initial);
  const [best,setBest]=useState(0);
  useEffect(()=>{try{setBest(Number(localStorage.getItem('veilhub-wheel-best-v1'))||0)}catch{}},[]);
  useEffect(()=>{if(game.phase!=='playing')return;const timer=window.setInterval(()=>dispatch({type:'TICK'}),500);return()=>window.clearInterval(timer)},[game.phase]);
  useEffect(()=>{if(game.phase!=='ended'||game.score<=best)return;setBest(game.score);try{localStorage.setItem('veilhub-wheel-best-v1',String(game.score))}catch{}},[game.phase,game.score,best]);
  const move=useCallback((direction:Direction)=>dispatch({type:'MOVE',direction}),[]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;
      const direction:Record<string,Direction>={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
      const value=event.key.toLowerCase();
      if(direction[value]){if(game.phase==='playing'){event.preventDefault();move(direction[value]);}return;}
      if(value==='e'&&game.phase==='playing'){event.preventDefault();dispatch({type:'STAKE'});}
      if((value===' '||value==='enter')&&game.phase!=='playing'&&!target.closest('button,a,[role="button"]')){event.preventDefault();dispatch({type:'START'});}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[game.phase,move]);
  const nearStation=atStation(game.player);
  return <AppShell active="arcade">
    <header className="wheel-head"><div><Link className="wheel-world-link" href="/app/arcade/"><ArrowLeft size={14}/> Back to pixel world</Link><span className="eyebrow">VEILHUB / ARCADE</span><h1>Wheel Circuit<span>_</span></h1><p>Guide a Squeek through the wheelhouse. Collect work pulses, dodge static and visit the staking dock to activate your power badge.</p></div><div className="wheel-disclaimer"><CircleHelp size={18}/><span>Arcade points only. No SQK, wallet transaction or on-chain staking.</span></div></header>
    <div className="wheel-layout"><section className="wheel-play" aria-label="Wheel Circuit game"><div className="wheel-scorebar"><div><small>TIME</small><strong>{clock(game.time)}</strong></div><div><small>WORK PULSES</small><strong>{game.work}</strong></div><div><small>ARCADE SCORE</small><strong>{game.score}</strong></div><div><small>LIVES</small><span aria-label={`${game.hearts} lives remaining`}>{Array.from({length:3},(_,i)=><Heart key={i} size={17} fill={i<game.hearts?'currentColor':'none'} className={i<game.hearts?'heart-full':'heart-empty'}/>)}</span></div></div>
      <div className="wheel-stage" role="group" aria-label={`Game board: Squeek at column ${game.player.x+1}, row ${game.player.y+1}; work pulse at column ${game.spark.x+1}, row ${game.spark.y+1}`}>
        <div className="wheel-stage-glow"/>
        {WALLS.map((wall,i)=><div className="wheel-wall" key={i} style={cell(wall)}/>)}
        <div className={`wheel-station ${nearStation?'near':''} ${game.staked?'active':''}`} style={pos(STATION)}><span>◇</span><small>STAKE<br/>DOCK</small></div>
        <div className="wheel-spark" style={pos(game.spark)}><Bolt size={23} fill="currentColor"/></div>
        {hazardAt(game.tick).map((hazard,i)=><div className="wheel-hazard" key={i} style={pos(hazard)}><span>✕</span></div>)}
        <div className={`wheel-player ${game.invulnerable?'invulnerable':''}`} style={pos(game.player)}><img src="/brand/veilhub-mark.svg" alt=""/><span className="sr-only">Squeek</span></div>
        {game.phase!=='playing'&&<div className="wheel-overlay"><div className="wheel-overlay-card"><span className="eyebrow">{game.phase==='ready'?'READY TO RUN?':game.hearts===0?'OUT OF CHARGE':'TIME IS UP'}</span><h2>{game.phase==='ready'?'A little wheel work.':`${game.score} arcade points.`}</h2><p>{game.phase==='ready'?'Move with WASD or arrow keys. Pick up the gold pulses and avoid the red static. Reach the dock and press E to activate your virtual Squeek stake.':`You collected ${game.work} work pulses. Best score: ${Math.max(best,game.score)}.`}</p><button className="button primary" onClick={()=>dispatch({type:'START'})}>{game.phase==='ready'?'Start run':'Play again'} <ArrowRight size={16}/></button></div></div>}
      </div>
      <div className="wheel-mobile-controls"><div className="wheel-dpad"><button aria-label="Move up" onClick={()=>move('up')} disabled={game.phase!=='playing'}><ArrowUp/></button><div><button aria-label="Move left" onClick={()=>move('left')} disabled={game.phase!=='playing'}><ArrowLeft/></button><button aria-label="Move down" onClick={()=>move('down')} disabled={game.phase!=='playing'}><ArrowDown/></button><button aria-label="Move right" onClick={()=>move('right')} disabled={game.phase!=='playing'}><ArrowRight/></button></div></div><button className="wheel-mobile-stake" onClick={()=>dispatch({type:'STAKE'})} disabled={game.phase!=='playing'||!nearStation}>{game.staked?'Unstake badge':'Stake badge'}</button></div>
      <div className="wheel-legend"><span><i className="legend-pulse"/> Work pulse</span><span><i className="legend-hazard"/> Static · lose a life</span><span><i className="legend-dock"/> Staking dock</span></div>
    </section>
    <aside className="wheel-aside"><div className="wheel-panel"><div className="wheel-panel-top"><span className="eyebrow">YOUR RUN</span><Trophy size={18}/></div><div className="wheel-best"><small>PERSONAL BEST</small><strong>{best}</strong><span>Saved in this browser</span></div><div className="wheel-divider"/><div className="wheel-power"><span className={game.staked?'power-led on':'power-led'}/><div><small>VIRTUAL SQUEEK</small><strong>{game.staked?'Staked · 2× arcade score':'In your pocket · 1× score'}</strong></div></div><p>Reach the green dock and press <kbd>E</kbd> to place or remove the badge. The boost affects game points only.</p><button className="wheel-stake-button" onClick={()=>dispatch({type:'STAKE'})} disabled={game.phase!=='playing'||!nearStation}>{game.staked?'Remove badge':'Place badge at dock'} <ArrowUpRight size={15}/></button></div>
      <div className="wheel-how"><span className="eyebrow">HOW TO PLAY</span><ol><li><b>01</b><span>Move with <kbd>W A S D</kbd> or arrow keys.</span></li><li><b>02</b><span>Collect gold pulses. Keep a combo for more points.</span></li><li><b>03</b><span>Avoid static. Three hits end the run.</span></li><li><b>04</b><span>Visit the dock and press <kbd>E</kbd> for a virtual staking boost.</span></li></ol><button onClick={()=>dispatch({type:'RESET'})}><RotateCcw size={14}/> Reset board</button></div>
      <div className="wheel-real"><strong>Curious about the real system?</strong><p>Wheel activity and official staking are separate on-chain processes. This game illustrates the ideas with local scores.</p><Link href="/app/staking/">Open Staking Lab <ArrowUpRight size={15}/></Link><a href="https://docs.squeekchain.com/rewards/staking/" target="_blank" rel="noreferrer">Official staking guide <ArrowUpRight size={15}/></a></div>
    </aside></div>
  </AppShell>;
}
