import { createPublicClient, http, parseAbi, parseAbiItem, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import deployment from './deployment.json';
import tradeDeployment from './trade-deployment.json';
// Official Sepolia release core-sepolia-20261103, revision 7.
export const NFT = '0xc4c7982657f00509548f3a3a41db7fa439a6856b' as Address;
export const SQK = '0xd78a3956cf63164d1fa1c622ad3c66623162fa1e' as Address;
export const CORE = '0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4' as Address;
export const MINING = '0x2dccb11fcc2defdd188555e45acb52231e82e218' as Address;
export const STAKING = '0x50fd1780526c3186a0c037c7622203bc4fb611ca' as Address;
export const MARKET = deployment.address as Address | null;
export const TRADE = tradeDeployment.address as Address | null;
export const client = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com') });
export const nftAbi = parseAbi(['function balanceOf(address) view returns (uint256)', 'function ownerOf(uint256) view returns (address)', 'function tokenURI(uint256) view returns (string)', 'function getApproved(uint256) view returns (address)', 'function approve(address,uint256)']);
const transferEvent = parseAbiItem('event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)');
const nftDeploymentBlock = 12057769n;
export const stakingDeploymentBlock = 12058156n;

/** Discover candidates from the official NFT's transfer logs; verify every candidate against live ownerOf. */
export async function ownedSqueeks(account: Address): Promise<bigint[]> {
  const balance = await client.readContract({address: NFT, abi: nftAbi, functionName: 'balanceOf', args: [account]});
  if (balance === 0n) return [];
  const latest = await client.getBlockNumber();
  const candidates = new Set<bigint>();
  const ranges: {fromBlock: bigint; toBlock: bigint}[] = [];
  for (let fromBlock = nftDeploymentBlock; fromBlock <= latest; fromBlock += 10000n) {
    ranges.push({fromBlock, toBlock: fromBlock + 9999n > latest ? latest : fromBlock + 9999n});
  }
  for (let i = 0; i < ranges.length; i += 4) {
    const pages = await Promise.all(ranges.slice(i, i + 4).map(range => client.getLogs({address: NFT, event: transferEvent, args: {to: account}, ...range})));
    for (const log of pages.flat()) if (log.args.tokenId !== undefined) candidates.add(log.args.tokenId);
  }
  const ids = [...candidates];
  const owned: bigint[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const owners = await Promise.all(ids.slice(i, i + 20).map(id => client.readContract({address: NFT, abi: nftAbi, functionName: 'ownerOf', args: [id]}).catch(() => null)));
    owners.forEach((owner, index) => {if (owner?.toLowerCase() === account.toLowerCase()) owned.push(ids[i + index]);});
  }
  return owned.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}
export const tokenAbi = parseAbi(['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)']);
export const tradeAbi = parseAbi([
  'function nft() view returns (address)', 'function sqk() view returns (address)', 'function paused() view returns (bool)',
  'function tokenCount() view returns (uint256)', 'function tokenPage(uint256,uint256) view returns (uint256[])',
  'function sales(uint256) view returns (address seller,uint128 price,uint256 nonce)',
  'function earnings(address) view returns (uint256)', 'function list(uint256,uint128)', 'function cancel(uint256)',
  'function buy(uint256,uint256,uint256)', 'function claim()'
]);
export const royaltyAbi = parseAbi(['function royaltyInfo(uint256,uint256) view returns (address,uint256)']);
export const stakingAbi = parseAbi([
  'function accountPower(address) view returns (uint256 nftPower,uint256 sqkPower)',
  'function basePower(address,uint8) view returns (uint64)',
  'function claimable(address) view returns (uint256)',
  'function depositor(address,uint256) view returns (address)',
  'function powerParameters() view returns (uint256 sqkPerPower,uint256 referencePower)',
  'function stakeOf(address) view returns (uint256 principal,uint256 freshPrincipal,uint64 freshUntilRound)',
  'function totalStaked() view returns (uint256)',
  'function totalFresh() view returns (uint256,uint64)',
  'function launchReady() view returns (bool)',
  'function rewardState() view returns ((uint256 funded,uint256 paid,uint256 compounded,uint256 rewardIndex,uint256 remaining,uint128 totalNftPower,uint128 totalSqkPower,uint256 streamRate,uint64 lastAccruedAt,uint64 streamEndsAt))'
]);
export const depositedEvent = parseAbiItem('event Deposited(address indexed account,address indexed collection,uint256 indexed tokenId,uint8 level,uint64 basePower,uint256 power)');
export const marketAbi = parseAbi([
  'function listings(uint256) view returns (address owner,uint128 pricePerDay,uint16 minDays,uint16 maxDays,uint16 feeBps,bool listed,address renter,uint64 expiresAt,uint256 nonce)',
  'function tokenCount() view returns (uint256)', 'function tokenPage(uint256,uint256) view returns (uint256[])',
  'function earnings(address) view returns (uint256)', 'function paused() view returns (bool)', 'function feeBps() view returns (uint16)',
  'function nft() view returns (address)', 'function sqk() view returns (address)',
  'function list(uint256,uint128,uint16,uint16)', 'function delist(uint256)', 'function withdraw(uint256)',
  'function rent(uint256,uint16,uint256,uint256)', 'function claim()', 'function isUsable(uint256,address) view returns (bool)',
  'error InvalidInput()', 'error Unauthorized()', 'error Unavailable()', 'error ActiveRental()', 'error MarketPaused()', 'error StaleQuote()', 'error UnexpectedDeposit()', 'error UnsupportedPayment()', 'error NothingToClaim()'
]);
export type Listing = { id: bigint; owner: Address; pricePerDay: bigint; minDays: number; maxDays: number; feeBps: number; listed: boolean; renter: Address; expiresAt: bigint; nonce: bigint };
export async function readListing(id: bigint): Promise<Listing> {
  const l = await client.readContract({address: MARKET!, abi: marketAbi, functionName: 'listings', args: [id]});
  return {id, owner:l[0], pricePerDay:l[1], minDays:l[2], maxDays:l[3], feeBps:l[4], listed:l[5], renter:l[6], expiresAt:l[7], nonce:l[8]};
}
export const short = (a: string) => `${a.slice(0,6)}…${a.slice(-4)}`;
export const explorer = (a: string) => `https://eth-sepolia.blockscout.com/address/${a}`;
