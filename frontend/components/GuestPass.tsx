import { ArrowRight, House, KeyRound, ShieldCheck } from 'lucide-react';
import Brand from './Brand';
import './GuestPass.css';

/** Decorative protocol illustration, never a live listing or rental receipt. */
export default function GuestPass(){return <figure className="guest-pass-scene" aria-label="Illustration of a SubletSqk guest pass and the holder-to-guest-to-home rental journey">
  <div className="pass-scene-label"><span className="pass-spark"/> A LITTLE STAY. A CLEAR WAY HOME.</div>
  <div className="pass-stack">
    <div className="pass-backing" aria-hidden="true"><span>SUBLETSQK / THE RENTAL NEIGHBORHOOD</span><KeyRound size={22}/></div>
    <div className="guest-ticket">
      <div className="ticket-body"><div className="ticket-brandline"><span>SubletSqk</span><span>SEPOLIA EDITION</span></div><div className="ticket-main"><div><span className="ticket-eyebrow">MAKE YOURSELF AT HOME</span><div className="ticket-title">Guest<br/>pass<span>↗</span></div></div><div className="ticket-mascot"><Brand/><span>JUST<br/>VISITING.</span></div></div><div className="ticket-bottom"><span><KeyRound size={12}/> TEMPORARY USAGE</span><span className="ticket-stamp">USAGE ONLY</span></div></div>
      <div className="ticket-perforation" aria-hidden="true"/>
      <div className="ticket-stub"><span className="stub-label">OPEN POSSIBILITIES</span><div className="stub-key"><KeyRound size={34}/></div><div className="ticket-bars" aria-hidden="true">{[1,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,1,3,2,1].map((n,i)=><i key={i} style={{height:`${n*4+9}px`}}/>)}</div><span className="stub-footer">SQK / ETHEREUM</span></div>
    </div>
  </div>
  <div className="pass-journey" aria-label="Holder to guest to home"><div><ShieldCheck size={15}/><span>Holder</span></div><span className="journey-connector"><i/><ArrowRight size={12}/></span><div><KeyRound size={15}/><span>Guest</span></div><span className="journey-connector"><i/><ArrowRight size={12}/></span><div><House size={15}/><span>Home</span></div></div>
  <figcaption>THE RENTAL JOURNEY <span>·</span> ILLUSTRATION, NOT A LIVE PASS</figcaption>
</figure>}
