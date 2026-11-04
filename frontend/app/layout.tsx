import type {Metadata} from 'next';
import './globals.css';
import './top-nav.css';
export const metadata: Metadata = {title:'VeilHub',description:'A Sepolia-only Squeek NFT rental marketplace. Temporary usage, transparent SQK payments.'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;}
