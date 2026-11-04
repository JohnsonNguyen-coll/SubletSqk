import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {createPublicClient, createWalletClient, http, formatEther, parseAbi, encodeDeployData} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {sepolia} from 'viem/chains';

const nft='0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6';
const sqk='0x6872bfa5ccc3e9e440c6c16e5ffdabb8dba4cc76';
const record=path.resolve('../frontend/lib/trade-deployment.json');
const journal=path.resolve('deployments/trade-pending.json');
const key=process.env.PRIVATE_KEY;
const rpc=process.env.SEPOLIA_RPC_URL;
if(!key||!rpc)throw Error('Fill PRIVATE_KEY and SEPOLIA_RPC_URL in contract/.env.');
const account=privateKeyToAccount(key.startsWith('0x')?key:`0x${key}`);
const publicClient=createPublicClient({chain:sepolia,transport:http(rpc)});
const walletClient=createWalletClient({account,chain:sepolia,transport:http(rpc)});
if((await publicClient.getChainId())!==11155111)throw Error('Sepolia only.');
if(JSON.parse(fs.readFileSync(record,'utf8')).address)throw Error('Trade contract already recorded. Refusing duplicate deployment.');
const artifact=JSON.parse(fs.readFileSync('out/SqueekTrade.sol/SqueekTrade.json','utf8'));
const bytecode=artifact.bytecode.object;
const args=[nft,sqk,account.address];
let hash;
if(fs.existsSync(journal))hash=JSON.parse(fs.readFileSync(journal,'utf8')).hash;
else{
  const balance=await publicClient.getBalance({address:account.address});
  const gas=await publicClient.estimateGas({account:account.address,data:encodeDeployData({abi:artifact.abi,bytecode,args})});
  const fees=await publicClient.estimateFeesPerGas();
  const worst=gas*fees.maxFeePerGas;
  console.log(`Deploying SqueekTrade to Sepolia from ${account.address}; balance ${formatEther(balance)} ETH; estimated max gas ${formatEther(worst)} ETH.`);
  if(balance<=worst)throw Error('Insufficient Sepolia ETH for estimated deployment gas.');
  hash=await walletClient.deployContract({abi:artifact.abi,bytecode,args});
  fs.mkdirSync(path.dirname(journal),{recursive:true});
  fs.writeFileSync(journal,JSON.stringify({hash,chainId:11155111},null,2));
  console.log(`Broadcast: ${hash}`);
}
const receipt=await publicClient.waitForTransactionReceipt({hash,confirmations:2,timeout:180000});
if(receipt.status!=='success'||!receipt.contractAddress)throw Error('Deployment reverted or missing contract address.');
const address=receipt.contractAddress;
const abi=parseAbi(['function nft() view returns (address)','function sqk() view returns (address)','function owner() view returns (address)','function paused() view returns (bool)']);
const [actualNft,actualSqk,admin,paused,code]=await Promise.all([
  publicClient.readContract({address,abi,functionName:'nft'}),publicClient.readContract({address,abi,functionName:'sqk'}),
  publicClient.readContract({address,abi,functionName:'owner'}),publicClient.readContract({address,abi,functionName:'paused'}),
  publicClient.getCode({address})
]);
if(!code||actualNft.toLowerCase()!==nft.toLowerCase()||actualSqk.toLowerCase()!==sqk.toLowerCase()||admin.toLowerCase()!==account.address.toLowerCase()||paused)throw Error('Deployed trade contract failed binding verification.');
const result={chainId:11155111,address,transactionHash:hash,blockNumber:Number(receipt.blockNumber),nft:actualNft,sqk:actualSqk,admin};
fs.writeFileSync(record,JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.resolve('deployments/trade-sepolia.json'),JSON.stringify(result,null,2)+'\n');
fs.rmSync(journal,{force:true});
console.log(`Verified SqueekTrade: ${address}; block ${receipt.blockNumber}`);
