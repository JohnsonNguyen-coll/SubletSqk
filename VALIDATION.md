# Verification record

Validated locally November 3–4, 2026 (Asia/Bangkok).

- Foundry 1.7.1, Solidity 0.8.30, OpenZeppelin v5.6.1.
- `npm test`: 17 passing tests, zero failures, 256 price/duration/fee fuzz runs.
- `npm run build:contracts`: success, including `script/Deploy.s.sol`. Timestamp lint notices relate to the intentional expiry clock; no Solidity compilation errors.
- `npm --prefix frontend run build`: successful static export and TypeScript checks on Next.js 16.4.4 / wagmi 3.7.11.
- Root and frontend `npm audit`: zero reported vulnerabilities after dependency updates.
- Live Sepolia RPC check: chain ID 11155111, official NFT/SQK deployed, SQK decimals 18, NFT ERC-4907 support false.
- NFT runtime code hash: `0xb935d3029b64127750376843a5be2fb148d40085ad4f0d2776f102af1f8eb591`.
- SQK runtime code hash: `0x6b5a0aeab5d0d42e1ea3fefe88a678ad0f9e4af4e09e29ed0d38db20759b3f00`.
- Browser QA: 1440px desktop and 375px mobile; inspected homepage, My Squeeks and Earnings, navigation and filter expansion. Mobile page width does not exceed viewport. No browser console errors observed in the checked session.
- Private Sites frontend publication succeeded: `https://hamsterdam-squeek-rentals.hoangnguyen181104hi.chatgpt.site`.

Contract deployment has not been sent: `.env` has a blank testnet key. Wallet transaction flow against the deployed rental contract and a real NFT/SQK rental have therefore not been validated end to end. No test NFT, token or listing has been inserted into the frontend.

Vendored source revisions:

- OpenZeppelin: `5fd1781b1454fd1ef8e722282f86f9293cacf256`.
- forge-std: `dc647cc030d9d65910d8f1172a0cde48d7106e32`.

No external security audit has been performed.
