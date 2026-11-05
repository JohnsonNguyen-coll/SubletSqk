import {config as loadEnv} from 'dotenv';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPublicClient,createWalletClient,http,getAddress,parseAbi,encodeDeployData,formatEther} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {sepolia} from 'viem/chains';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
loadEnv({path:resolve(root,'.env'),quiet:true});
const nft=getAddress('0xc4c7982657f00509548f3a3a41db7fa439a6856b');
const sqk=getAddress('0xd78a3956cf63164d1fa1c622ad3c66623162fa1e');
const release='core-sepolia-20261103';
const rpc=process.env.SEPOLIA_RPC_URL||'https://ethereum-sepolia-rpc.publicnode.com';
const publicClient=createPublicClient({chain:sepolia,transport:http(rpc)});
const deployments=resolve(root,'deployments');
const frontend=resolve(root,'../frontend/lib');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const saveJson=async(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n');
const same=(a,b)=>a.toLowerCase()===b.toLowerCase();

async function main(){
  if(await publicClient.getChainId()!==11155111)throw Error('RPC is not Ethereum Sepolia.');
  const [nftCode,sqkCode,decimals]=await Promise.all([
    publicClient.getCode({address:nft}),publicClient.getCode({address:sqk}),
    publicClient.readContract({address:sqk,abi:parseAbi(['function decimals() view returns (uint8)']),functionName:'decimals'})
  ]);
  if(!nftCode||!sqkCode||decimals!==18)throw Error('Official NFT/SQK binding check failed.');
  console.log(`Verified official ${release}: NFT ${nft}; SQK ${sqk}`);
  if(process.argv.includes('--check'))return;
  const raw=process.env.PRIVATE_KEY?.trim();
  if(!raw||! /^(0x)?[0-9a-fA-F]{64}$/.test(raw))throw Error('Set a testnet-only PRIVATE_KEY in contract/.env.');
  const account=privateKeyToAccount(raw.startsWith('0x')?raw:`0x${raw}`);
  const wallet=createWalletClient({account,chain:sepolia,transport:http(rpc)});
  const treasury=process.env.PROTOCOL_TREASURY?getAddress(process.env.PROTOCOL_TREASURY):account.address;
  await mkdir(deployments,{recursive:true});
  const specs=[
    {kind:'rental',artifact:'SubletSqk.sol/SubletSqk.json',args:[nft,sqk,treasury,account.address],output:'deployment.json',record:'sepolia.json'},
    {kind:'trade',artifact:'SqueekTrade.sol/SqueekTrade.json',args:[nft,sqk,account.address],output:'trade-deployment.json',record:'trade-sepolia.json'}
  ];
  for(const spec of specs){
    const output=resolve(frontend,spec.output),record=resolve(deployments,spec.record);
    const existing=await readJson(output);
    if(existing.release===release&&existing.address){
      const [boundNft,boundSqk,code]=await Promise.all([
        publicClient.readContract({address:getAddress(existing.address),abi:parseAbi(['function nft() view returns (address)']),functionName:'nft'}),
        publicClient.readContract({address:getAddress(existing.address),abi:parseAbi(['function sqk() view returns (address)']),functionName:'sqk'}),
        publicClient.getCode({address:getAddress(existing.address)})
      ]);
      if(!code||!same(boundNft,nft)||!same(boundSqk,sqk))throw Error(`${spec.kind}: recorded deployment binding mismatch.`);
      console.log(`${spec.kind}: already verified at ${existing.address}`);continue;
    }
    if(existing.address){
      await copyFile(output,resolve(deployments,`${spec.kind}-legacy-20261103.json`));
      console.log(`${spec.kind}: preserved previous deployment record.`);
    }
    const artifact=await readJson(resolve(root,'out',spec.artifact));
    const journal=resolve(deployments,`${spec.kind}-${release}-pending.json`);
    let pending;try{pending=await readJson(journal)}catch{}
    if(!pending?.hash){
      const balance=await publicClient.getBalance({address:account.address});
      const gas=await publicClient.estimateGas({account:account.address,data:encodeDeployData({abi:artifact.abi,bytecode:artifact.bytecode.object,args:spec.args})});
      const fee=await publicClient.estimateFeesPerGas();
      if(balance<=gas*fee.maxFeePerGas*12n/10n)throw Error(`${spec.kind}: insufficient Sepolia ETH for estimated gas.`);
      console.log(`${spec.kind}: deploying from ${account.address}; balance ${formatEther(balance)} ETH.`);
      const hash=await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode.object,args:spec.args,gas:gas*12n/10n});
      pending={hash,account:account.address,release};await saveJson(journal,pending);
      console.log(`${spec.kind}: transaction ${hash}`);
    }
    if(!same(pending.account,account.address)||pending.release!==release)throw Error(`${spec.kind}: pending deployment journal does not match signer/release.`);
    const receipt=await publicClient.waitForTransactionReceipt({hash:pending.hash,confirmations:2,timeout:180000});
    if(receipt.status!=='success'||!receipt.contractAddress)throw Error(`${spec.kind}: deployment transaction failed.`);
    const address=getAddress(receipt.contractAddress);
    const read={address,abi:parseAbi(['function nft() view returns (address)','function sqk() view returns (address)','function owner() view returns (address)'])};
    const [boundNft,boundSqk,owner]=await Promise.all(['nft','sqk','owner'].map(functionName=>publicClient.readContract({...read,functionName})));
    if(!same(boundNft,nft)||!same(boundSqk,sqk)||!same(owner,account.address))throw Error(`${spec.kind}: post-deployment bindings failed.`);
    const result={chainId:11155111,release,address,transactionHash:pending.hash,blockNumber:Number(receipt.blockNumber),nft,sqk,admin:account.address,...(spec.kind==='rental'?{treasury}:{})};
    await saveJson(output,result);await saveJson(record,result);
    console.log(`${spec.kind}: verified ${address} at block ${receipt.blockNumber}`);
  }
}
main().catch(error=>{console.error(error.shortMessage||error.message?.split('\n')[0]||'Deployment failed.');process.exitCode=1;});
