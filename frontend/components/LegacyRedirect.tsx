'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export default function LegacyRedirect({to}:{to:string}){const router=useRouter();useEffect(()=>router.replace(to),[router,to]);return <main className="shell legacy-redirect"><h1>The app has a new home.</h1><Link className="button primary" href={to}>Continue to VeilHub</Link></main>}
