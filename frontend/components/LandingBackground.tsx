'use client';
import Plasma from './Plasma';

export default function LandingBackground() {
  return <div className="landing-background" aria-hidden="true">
    <Plasma color="#ff833b" speed={0.45} direction="forward" scale={0.9} twist={1.2} wave={1.1} brightness={0.45} shine={0.2} softness={0.32} opacity={0.85} mouseInteractive={false} quality={0.55} dpr={1}/>
    <div className="landing-vignette"/>
  </div>;
}
