'use client';
import { useState, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const config = createConfig({ chains: [sepolia], connectors: [injected()], transports: {[sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')}, ssr: true });
export default function Providers({children}: {children: ReactNode}) {
  const [query] = useState(() => new QueryClient());
  return <WagmiProvider config={config}><QueryClientProvider client={query}>{children}</QueryClientProvider></WagmiProvider>;
}
