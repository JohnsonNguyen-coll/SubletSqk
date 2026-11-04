# VeilHub

Sepolia-only Squeek NFT rental escrow and temporary usage registry, with a Next.js + wagmi/viem frontend. This is an independent project, not an official Squeekchain integration.

## Repository layout

- `contract/` contains the Foundry project, Solidity source, tests, deployment scripts, dependencies, research and Sepolia deployment records.
- `frontend/` contains the Next.js website and its public assets. Set the Vercel Root Directory to `frontend`.
- `README.md` covers both parts of the project.

## Deployment status

The rental contract is deployed on Sepolia. Set the Vercel Root Directory to `frontend` to publish the VeilHub website.

<!-- DEPLOYMENT -->
Rental: [0x43A8B02a3abc4d6C1d373FAE8385f618BC4f3bc3](https://eth-sepolia.blockscout.com/address/0x43A8B02a3abc4d6C1d373FAE8385f618BC4f3bc3)  
Transaction: [0x3101f963ea123d281b0ce7774bd8fa1f2d37e6f1801c29d12c7708030b4c4c9b](https://eth-sepolia.blockscout.com/tx/0x3101f963ea123d281b0ce7774bd8fa1f2d37e6f1801c29d12c7708030b4c4c9b)  
Deployment block: 12057052

Smart contract deployed and verified on Sepolia. The frontend deployment record contains its confirmed address.

The deployed Solidity contract retains its original `SubletSqk` identifier. The VeilHub name applies to the website, documentation and package branding; renaming the deployed contract is not possible without a new deployment.

| Input | Verified official value |
| --- | --- |
| Network | Ethereum Sepolia, chain ID `11155111` |
| Squeek NFT | `0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6` |
| SQK (18 decimals) | `0x6872bfa5ccc3e9e440c6c16e5ffdabb8dba4cc76` |
| SqueekMining proxy | `0x3beE588fC20dE788Bac17d33b41Da7346cb27EC4` |
| ERC-4907 | Not supported: live `supportsInterface(0xad092b5c)` returned false |
| Eligibility | SqueekMining claim/merge require NFT ownership; approvals do not authorize either |

Sources checked November 3, 2026: [deployment record](https://docs.squeekchain.com/assets/deployments/sepolia.json), [NFT reference](https://docs.squeekchain.com/developers/nft/), [mining reference](https://docs.squeekchain.com/developers/mining/). Pinned official ABIs and the deployment record are in `contract/research/`. These technical references describe the deployed owner-based system; the whitepaper describes a different proposed staking economy. Do not mix the two. The official docs describe Sepolia minting as paused; a live read on November 4, 2026 found `paused() = false` but `mintPhase() = Closed`. Check current on-chain state before attempting to mint. VeilHub provides no NFT or SQK faucet; Sepolia ETH faucets supply gas only.

## Architecture and compatibility

`Holder → VeilHub NFT escrow ← renter's SQK payment → claimable owner / treasury balances`

The holder approves one NFT and calls `list(tokenId, pricePerDay, minDays, maxDays)`. The NFT is safely transferred into an immutable, non-upgradeable contract. The depositor retains the sole withdrawal entitlement. **On-chain `ownerOf` becomes the escrow address:** the implementation follows the requested escrow model, so it is not literal ownership-preserving ERC-4907 rental. Neither renter nor admin ever acquires the NFT. The application has no custodial wallet or backend signer.

Renter calls `rent(tokenId, daysCount, maxTotal, expectedNonce)`. SQK payment is `pricePerDay × daysCount`, at 18 decimals. Exact balance-change validation rejects fee-on-transfer payments. The quote nonce rejects a withdrawn/replaced listing, and the maximum total protects the displayed price. Self-rental is rejected. One listing permits one rental; after expiry the owner withdraws and may create a fresh listing. Duration is 1–365 whole days. The full fee is paid up front and is non-refundable; no early cancellation.

`isUsable(tokenId, account)` is true only for the recorded renter strictly before `expiresAt`. It is false at the exact expiry boundary, without a keeper transaction. Integrating games must explicitly read this registry; **current Squeekchain mining, claims, merges and proposed staking do not honor it**. This does not pretend to unlock those actions. No ERC-4907 role is mirrored because the official NFT does not support it. No game integration is claimed to exist today.

Mining reward sharing is deliberately omitted. SqueekMining rewards are attached to the NFT in the deployed version. This contract never calls mining, claims those rewards or merges NFTs. Any unclaimed credit remains attached to the NFT and becomes accessible to its actual owner after withdrawal. Before listing, holders should consider claiming existing rewards themselves. NFT rewards cannot be claimed through this escrow while deposited. No return or earning rate is estimated.

## Fees, withdrawals and administration

Default protocol fee is 500 basis points (5%), with 95% to the depositor. Fee rounds down in SQK base units; all rounding remainder belongs to the depositor. The fee is snapshotted on listing, so later configuration changes apply only to new listings. Fee cannot exceed 1,000 basis points (10%). Treasury is immutable.

Rent collects payment and credits `earnings(owner)` and `earnings(treasury)`. Each account calls `claim()` for its own full balance. `totalLiability` tracks unpaid balances. There are no push transfers and no admin sweep, rescue, upgrade, arbitrary external call, beneficiary replacement or user-fund withdrawal method.

Owner can delist only when no rental is active. Delisting keeps the NFT in escrow; `withdraw(tokenId)` returns it and deletes the position. Withdrawal works directly for an idle listed NFT too. During an active rental both delist and withdraw revert. After expiry, only the original depositor can withdraw.

Ownable2Step administrator can pause new listings/rentals or change the fee for future listings. Pause never blocks delist, withdraw, or claim. The constructor and deployment scripts reject chains other than Sepolia. ERC-721 receiver accepts only the expected safe deposit initiated by `list`. Do not manually use `transferFrom` to send NFTs to this contract: ERC-721 cannot reject unsafe transfers and there is intentionally no admin rescue. Unsolicited ERC-20 transfers are not credited and cannot be swept.

## Run locally

Requirements: Node 22+ and npm. Native Foundry can be used instead of the bundled npm binary.

```powershell
npm --prefix contract ci
npm --prefix frontend ci
npm --prefix contract test
npm --prefix frontend run build
npm --prefix frontend run dev
```

Open `http://127.0.0.1:3000`. `contract/.npmrc` disables install scripts to work around the npm Foundry wrapper's Unix-only postinstall on Windows; its official platform binary is installed as an optional dependency. OpenZeppelin v5.6.1 and forge-std source dependencies are vendored under `contract/lib/`. Solidity compiler is pinned to 0.8.30 with Cancun EVM.

Public routes: `/` landing, `/how-it-works/`, `/docs/`, `/docs/renting/`, `/docs/listing/`, `/docs/security/`, `/docs/contracts/` and `/faq/`. Launch app opens the live Sepolia marketplace at `/app/`. Its four tabs have separate URLs: `/app/`, `/app/squeeks/`, `/app/rentals/` and `/app/earnings/`. The app reads deployed contract state, discovers wallet NFTs from official Transfer logs, and requests wallet signatures for listing, renting, withdrawing and claiming. WalletConnect requires `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`; an injected browser wallet can connect without it.

Every listing links to a shareable `/app/squeek/?id=<tokenId>` detail page with on-chain artwork, traits, rental terms and current ownership. Before listing, the app checks wallet ownership, Sepolia ETH and the official SqueekMining `claimable(0, [tokenId])` value; holders must acknowledge nonzero unclaimed rewards because escrow prevents their wallet from claiming until withdrawal. Before renting, the app displays SQK balance, allowance and Sepolia ETH. These reads can change before a transaction is mined; wallet confirmation and contract checks remain authoritative.

Every listing links to a shareable `/app/squeek/?id=<tokenId>` detail page with on-chain artwork, traits, rental terms and current ownership. Before listing, the app checks wallet ownership, Sepolia ETH and the official SqueekMining `claimable(0, [tokenId])` value; holders must acknowledge nonzero unclaimed rewards because escrow prevents their wallet from claiming until withdrawal. Before renting, the app displays SQK balance, allowance and Sepolia ETH. These reads can change before a transaction is mined; wallet confirmation and contract checks remain authoritative.

For Vercel, set the Root Directory to `frontend`. If you want WalletConnect and mobile wallet options, set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in Vercel Environment Variables and redeploy; see `frontend/.env.example`. `NEXT_PUBLIC_SEPOLIA_RPC_URL` can override the default public Sepolia RPC. These variables are public frontend configuration, never private keys.


The current app invokes the deployed Sepolia rental contract directly. There are no sample listings, browser balances or simulated actions. Real transactions require a compatible wallet, Sepolia ETH for gas and the official Sepolia NFT or SQK as applicable. VeilHub does not distribute those assets; the market can remain empty until a holder lists an eligible NFT.

Read-only Sepolia verification on November 4, 2026 confirmed chain ID `11155111`, contract code at the recorded rental address, matching `nft()` and `sqk()` bindings, and `tokenCount() = 0`. No live list/rent/claim transaction has been executed in this verification.

## Deploy to Sepolia

1. Fill `PRIVATE_KEY` and `SEPOLIA_RPC_URL` in `contract/.env`. Use a testnet-only key. Optionally set `PROTOCOL_TREASURY`; default is the deployer.
2. Fund the deployer with Sepolia ETH. Do not send mainnet assets.
3. Run:

```powershell
npm --prefix contract test
npm --prefix contract run build:contracts
node contract/script/deploy.mjs --check
npm --prefix contract run deploy:sepolia
npm --prefix frontend run build
```

The deploy script checks chain ID, deployed dependency code, SQK decimals, and ERC-4907 support; estimates gas; signs locally; waits for two confirmations; verifies rental NFT/SQK/admin/fee bindings; records the actual address, receipt and deployment block in `contract/deployments/sepolia.json`, `frontend/lib/deployment.json` and this README. It records a transaction journal for safe receipt resumption and refuses duplicate deployment when an address is already recorded. Private key never enters frontend, metadata, output or source archives. After deploying, publish the rebuilt static `frontend/out/` directory. The current Sepolia address is already recorded; the script will not deploy another contract over it.

Foundry alternative (requires Foundry on PATH, run from `contract/` and load `contract/.env`):

```powershell
cd contract
forge script script/Deploy.s.sol:Deploy --rpc-url sepolia --broadcast
```

Configure a `sepolia` RPC alias or use a public RPC URL with that command. The Foundry alternative does not update frontend records automatically; copy the verified receipt address and block into deployment records before building. Prefer `npm --prefix contract run deploy:sepolia` for automatic recording on a fresh deployment.

## Validation

17 Foundry tests pass, including 256 fuzz runs. Frontend production build passes on Next.js 16.4.4, RainbowKit 2.2.11 and wagmi 2.19.5. The protocol tests use local mock assets; public end-to-end transactions require genuine Sepolia Squeek NFTs and SQK, which VeilHub does not distribute.

Foundry covers list/delist, rent, 95/5 math, fee snapshot and cap, active-rental rejection, early withdrawal, exact expiry, withdrawal/relist nonce, claiming, unauthenticated operations, unexpected safe deposit, reentrancy during SQK payment/claim and NFT withdrawal, pause preserving exits, and price/duration/fee fuzzing (256 runs). `npm --prefix frontend run build` typechecks and statically builds the public and app routes. Live Sepolia compatibility probe has confirmed the official dependency contracts exist and ERC-4907 is unsupported. A local-only mock NFT/SQK exists exclusively in `contract/test/` and is never used in the product UI or production deployment script.

This testnet prototype is not externally audited. Passing local tests does not establish compatibility with future Squeekchain upgrades. The official mining source is not explorer-verified per its docs, and governance can upgrade mining. Re-check deployed behavior before every integration change.
