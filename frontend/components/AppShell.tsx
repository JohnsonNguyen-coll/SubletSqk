'use client';
import Link from 'next/link';
import {ConnectButton} from '@rainbow-me/rainbowkit';
import {Wallet} from 'lucide-react';
import Brand from './Brand';
import BrandName from './BrandName';

export default function AppShell({active,children}:{active:'trade'|'staking'|'portfolio'|'arcade';children:React.ReactNode}){
  const links=[['/app/','Rent'],['/app/trade/','Trade'],['/app/staking/','Staking'],['/app/arcade/','Arcade'],['/app/portfolio/','Portfolio'],['/app/squeeks/','My Squeeks'],['/app/rentals/','My Rentals'],['/app/earnings/','Earnings'],['/docs/','Docs']];
  return <><div className="testnet-strip"><span className="live-dot"/> SEPOLIA TESTNET <span className="strip-divider">/</span> NFT trades on-chain · staking estimates labeled</div>
    <header className="header shell app-header"><Link href="/" className="wordmark"><Brand/><BrandName/></Link><nav className="primary-nav" aria-label="App navigation">{links.map(([href,label])=><Link key={href} href={href} aria-current={(active==='trade'&&href==='/app/trade/')||(active==='staking'&&href==='/app/staking/')||(active==='portfolio'&&href==='/app/portfolio/')||(active==='arcade'&&href==='/app/arcade/')?'page':undefined}>{label}</Link>)}</nav><ConnectButton.Custom>{({account,chain,openAccountModal,openChainModal,openConnectModal,mounted})=><button type="button" className="wallet-button" disabled={!mounted} onClick={!account?openConnectModal:chain?.unsupported?openChainModal:openAccountModal}><Wallet size={16}/>{!account?'Connect wallet':chain?.unsupported?'Wrong network':account.displayName}<span className="wallet-light"/></button>}</ConnectButton.Custom></header>
    <a className="skip-link" href="#main-content">Skip to main content</a><main className="shell app-main feature-main" id="main-content">{children}</main></>;
}
