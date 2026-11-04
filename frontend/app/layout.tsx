import type {Metadata} from 'next';
import './globals.css';
export const metadata: Metadata = {title:'SubletSqk — A little space for your Squeek',description:'A Sepolia-only Squeek NFT rental marketplace. Temporary usage, transparent SQK payments.'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;}
