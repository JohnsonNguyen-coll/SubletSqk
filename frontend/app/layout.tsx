import type {Metadata} from 'next';
import './globals.css';
import './top-nav.css';
export const metadata: Metadata = {title:'VeilHub',description:'Rent and trade official Squeek NFTs with SQK on Sepolia, and explore estimated staking scenarios.'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;}
