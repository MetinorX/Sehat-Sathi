# Hardhat Blockchain Layer

This Hardhat workspace deploys `AuditConsentRegistry` to anchor audit hashes and consent records.

## Setup

1. `cd backend/blockchain`
2. `npm install`
3. `npm run compile`
4. Start local chain: `npm run node`
5. In another terminal deploy and export backend-ready env values: `npm run deploy:export`

Deployment outputs:

- `backend/blockchain/deployments/localhost.json`
- `backend/.env.blockchain.generated`

## Use Generated Backend Env

After `deploy:export`, copy values from `backend/.env.blockchain.generated` into your backend env file.

Minimum required variables:

- `BLOCKCHAIN_ENABLED=true`
- `HARDHAT_RPC_URL=http://127.0.0.1:8545`
- `AUDIT_CONTRACT_ADDRESS=<deployed_address>`
- `AUDIT_CONTRACT_ABI_PATH=backend/blockchain/artifacts/contracts/AuditConsentRegistry.sol/AuditConsentRegistry.json`
- `AUDIT_SENDER_PRIVATE_KEY=<hardhat_account_private_key>`

## API Verification Flow

With backend running:

1. Call diabetes or xray endpoint (this anchors audit hash on-chain).
2. Read blockchain integration status:
	- `GET /api/v1/audit/status`
3. Fetch on-chain record by request id:
	- `GET /api/v1/audit/{request_id}`
4. Verify hash integrity:
	- `POST /api/v1/audit/verify` with `{request_id, expected_hash}`

## Backend Environment

Set these in backend environment:

- `BLOCKCHAIN_ENABLED=true`
- `HARDHAT_RPC_URL=http://127.0.0.1:8545`
- `AUDIT_CONTRACT_ADDRESS=<deployed_address>`
- `AUDIT_CONTRACT_ABI_PATH=backend/blockchain/artifacts/contracts/AuditConsentRegistry.sol/AuditConsentRegistry.json`
- `AUDIT_SENDER_PRIVATE_KEY=<hardhat_account_private_key>`

The backend will then anchor each consented audit record on-chain.
