import 'dotenv/config';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createPublicClient,createWalletClient,http,getAddress,parseAbi,formatEther,keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {sepolia} from 'viem/chains';

const NFT=getAddress('0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6');
const SQK=getAddress('0x6872bfa5ccc3e9e440c6c16e5ffdabb8dba4cc76');
const rpc=process.env.SEPOLIA_RPC_URL||'https://ethereum-sepolia-rpc.publicnode.com';
const client=createPublicClient({chain:sepolia,transport:http(rpc)});
const output='frontend/lib/deployment.json';
const artifact=JSON.parse(await readFile('out/SubletSqk.sol/SubletSqk.json','utf8'));
const probe=process.argv.includes('--check');
try {
  if(await client.getChainId()!==11155111)throw new Error('RPC must be Ethereum Sepolia (11155111).');
  const [nftCode,sqkCode,nftInterfaces,tokenDecimals]=await Promise.all([
    client.getCode({address:NFT}),client.getCode({address:SQK}),
    client.readContract({address:NFT,abi:parseAbi(['function supportsInterface(bytes4) view returns(bool)']),functionName:'supportsInterface',args:['0xad092b5c']}),
    client.readContract({address:SQK,abi:parseAbi(['function decimals() view returns(uint8)']),functionName:'decimals'})
  ]);
  if(!nftCode||!sqkCode||tokenDecimals!==18)throw new Error('Official NFT/SQK deployment checks failed.');
  console.log(JSON.stringify({chainId:11155111,nft:NFT,sqk:SQK,erc4907:nftInterfaces,nftCodeHash:keccak256(nftCode),sqkCodeHash:keccak256(sqkCode)},null,2));
  if(probe)process.exit(0);
  const raw=process.env.PRIVATE_KEY?.trim();
  if(!raw||! /^(0x)?[0-9a-fA-F]{64}$/.test(raw))throw new Error('Fill PRIVATE_KEY in the local .env. Never paste it in chat.');
  const account=privateKeyToAccount(raw.startsWith('0x')?raw:`0x${raw}`);
  const treasury=process.env.PROTOCOL_TREASURY?getAddress(process.env.PROTOCOL_TREASURY):account.address;
  const existing=JSON.parse(await readFile(output,'utf8'));
  if(existing.address)throw new Error('A deployment is already recorded. Refusing to deploy again.');
  const journal='deployments/sepolia-pending.json';
  await mkdir('deployments',{recursive:true});
  let pending;try{pending=JSON.parse(await readFile(journal,'utf8'));}catch{}
  if(pending?.transactionHash)console.log('Resuming the recorded deployment transaction.');
  else{
    const balance=await client.getBalance({address:account.address});
    console.log(`Deployer ${account.address}; Sepolia ETH ${formatEther(balance)}`);
    const wallet=createWalletClient({account,chain:sepolia,transport:http(rpc)});
    const args=[NFT,SQK,treasury,account.address];
    const gas=await client.estimateGas({account,data:(await import('viem')).encodeDeployData({abi:artifact.abi,bytecode:artifact.bytecode.object,args})});
    const fee=await client.estimateFeesPerGas();
    if(balance<gas*fee.maxFeePerGas)throw new Error('Insufficient Sepolia ETH for deployment gas.');
    const transactionHash=await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode.object,args,gas:gas*120n/100n});
    pending={transactionHash,deployer:account.address,treasury};
    await writeFile(journal,JSON.stringify(pending,null,2)+'\n');
    console.log(`Submitted ${transactionHash}`);
  }
  const receipt=await client.waitForTransactionReceipt({hash:pending.transactionHash,confirmations:2});
  if(receipt.status!=='success'||!receipt.contractAddress)throw new Error('Deployment transaction reverted.');
  const deployed=getAddress(receipt.contractAddress);
  const [boundNft,boundSqk,admin,fee]=await Promise.all(['nft','sqk','owner','feeBps'].map(functionName=>client.readContract({address:deployed,abi:artifact.abi,functionName})));
  if(boundNft!==NFT||boundSqk!==SQK||admin!==account.address||fee!==500)throw new Error('Post-deployment verification failed.');
  const record={chainId:11155111,address:deployed,transactionHash:pending.transactionHash,blockNumber:Number(receipt.blockNumber),deployer:account.address,treasury};
  await writeFile(output,JSON.stringify(record,null,2)+'\n');
  await writeFile('deployments/sepolia.json',JSON.stringify(record,null,2)+'\n');
  const readme=await readFile('README.md','utf8');
  const updated=readme.replace('<!-- DEPLOYMENT -->',`<!-- DEPLOYMENT -->\nRental: [${deployed}](https://eth-sepolia.blockscout.com/address/${deployed})  \nTransaction: [${pending.transactionHash}](https://eth-sepolia.blockscout.com/tx/${pending.transactionHash})  \nDeployment block: ${receipt.blockNumber}`)
    .replace(/Smart contract not deployed yet\.[^\n]*/, 'Smart contract deployed and verified on Sepolia. The frontend deployment record contains its confirmed address.');
  await writeFile('README.md',updated);
  console.log(`Verified Sepolia deployment: ${deployed}. Rebuild the frontend before publishing.`);
} catch(error) {
  // Avoid dumping RPC request bodies or environment values in errors.
  console.error(error.shortMessage||error.message?.split('\n')[0]||'Deployment failed.');process.exitCode=1;
}
