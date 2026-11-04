import 'dotenv/config';
import {createPublicClient, http, formatEther, formatUnits, parseAbi} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {sepolia} from 'viem/chains';
const key=process.env.PRIVATE_KEY;
const rpc=process.env.SEPOLIA_RPC_URL;
if(!key||!rpc)throw Error('Fill PRIVATE_KEY and SEPOLIA_RPC_URL in contract/.env.');
const account=privateKeyToAccount(key.startsWith('0x')?key:`0x${key}`);
const client=createPublicClient({chain:sepolia,transport:http(rpc)});
const [chainId,balance,nftCode,sqkCode]=await Promise.all([
  client.getChainId(),client.getBalance({address:account.address}),
  client.getCode({address:'0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6'}),
  client.getCode({address:'0x6872bfa5ccc3e9e440c6c16e5ffdabb8dba4cc76'})
]);
if(chainId!==11155111||!nftCode||!sqkCode)throw Error('RPC is not the expected Squeek Sepolia deployment.');
console.log(`Sepolia deployer ${account.address}; gas balance ${formatEther(balance)} ETH; official NFT/SQK code present.`);
const mining='0x3beE588fC20dE788Bac17d33b41Da7346cb27EC4';
const abi=parseAbi(['function REWARD_PER_BLOCK() view returns (uint256)','function weightForLevel(uint8,uint8) view returns (uint64)']);
const [reward,weight]=await Promise.all([
  client.readContract({address:mining,abi,functionName:'REWARD_PER_BLOCK'}),
  client.readContract({address:mining,abi,functionName:'weightForLevel',args:[0,1]})
]);
console.log(`Current Sepolia mining reference: ${formatUnits(reward,18)} SQK/block; Level 1 weight ${weight}.`);
const royaltyAbi=parseAbi(['function royaltyInfo(uint256,uint256) view returns (address,uint256)']);
const [receiver,amount]=await client.readContract({address:'0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6',abi:royaltyAbi,functionName:'royaltyInfo',args:[1n,100n*10n**18n]});
console.log(`Official NFT ERC-2981 reference at 100 SQK sale price: receiver ${receiver}; royalty ${formatUnits(amount,18)} SQK.`);
