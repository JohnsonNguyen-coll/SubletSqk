'use client';
import { useState, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';

const transport = http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const config = projectId
  ? getDefaultConfig({appName: 'SubletSqk', projectId, chains: [sepolia], transports: {[sepolia.id]: transport}, ssr: true})
  : createConfig({chains: [sepolia], connectors: [injected()], transports: {[sepolia.id]: transport}, ssr: true});

export default function Providers({children}: {children: ReactNode}) {
  const [query] = useState(() => new QueryClient());
  return <WagmiProvider config={config}><QueryClientProvider client={query}><RainbowKitProvider theme={darkTheme({accentColor:'#d8f6a1',accentColorForeground:'#1c2415',borderRadius:'medium'})}>{children}</RainbowKitProvider></QueryClientProvider></WagmiProvider>;
}
