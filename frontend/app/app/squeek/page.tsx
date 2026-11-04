import {Suspense} from 'react';
import SqueekDetail from '../../../components/SqueekDetail';
import './detail.css';

export default function Page(){return <Suspense fallback={<main className="shell squeek-detail"><p>Loading Squeek…</p></main>}><SqueekDetail/></Suspense>}
