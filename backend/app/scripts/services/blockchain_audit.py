import json
import os
from pathlib import Path
from typing import Dict, Any


class BlockchainAuditService:
    def __init__(self):
        self.rpc_url = os.getenv("HARDHAT_RPC_URL", "http://127.0.0.1:8545")
        self.enabled = os.getenv("BLOCKCHAIN_ENABLED", "false").lower() == "true"
        self.contract_address = os.getenv("AUDIT_CONTRACT_ADDRESS", "")
        self.abi_path = os.getenv(
            "AUDIT_CONTRACT_ABI_PATH",
            "backend/blockchain/artifacts/contracts/AuditConsentRegistry.sol/AuditConsentRegistry.json",
        )
        self.private_key = os.getenv("AUDIT_SENDER_PRIVATE_KEY", "")

    def _load_abi(self):
        path = Path(self.abi_path)
        if not path.is_absolute():
            project_root = Path(__file__).resolve().parents[3]
            path = project_root / path

        if not path.exists():
            raise FileNotFoundError(f"Contract ABI not found at {path}")

        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("abi", data)

    def _get_contract(self):
        from web3 import Web3

        if not self.contract_address:
            raise ValueError("contract_address_missing")

        w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        if not w3.is_connected():
            raise ConnectionError("rpc_unreachable")

        abi = self._load_abi()
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(self.contract_address),
            abi=abi,
        )
        return w3, contract

    def anchor_audit(
        self,
        request_id: str,
        audit_hash: str,
        consent_given: bool,
        purpose: str,
    ) -> Dict[str, Any]:
        if not self.enabled:
            return {
                "blockchain_enabled": False,
                "anchored": False,
                "status": "disabled",
                "tx_hash": None,
                "network": self.rpc_url,
            }

        try:
            from web3 import Web3
        except ImportError:
            return {
                "blockchain_enabled": True,
                "anchored": False,
                "status": "web3_missing",
                "tx_hash": None,
                "network": self.rpc_url,
            }

        try:
            if not self.contract_address:
                return {
                    "blockchain_enabled": True,
                    "anchored": False,
                    "status": "contract_address_missing",
                    "tx_hash": None,
                    "network": self.rpc_url,
                }

            try:
                w3, contract = self._get_contract()
            except ValueError:
                return {
                    "blockchain_enabled": True,
                    "anchored": False,
                    "status": "contract_address_missing",
                    "tx_hash": None,
                    "network": self.rpc_url,
                }
            except ConnectionError:
                return {
                    "blockchain_enabled": True,
                    "anchored": False,
                    "status": "rpc_unreachable",
                    "tx_hash": None,
                    "network": self.rpc_url,
                }

            if not self.private_key:
                return {
                    "blockchain_enabled": True,
                    "anchored": False,
                    "status": "private_key_missing",
                    "tx_hash": None,
                    "network": self.rpc_url,
                }

            account = w3.eth.account.from_key(self.private_key)
            nonce = w3.eth.get_transaction_count(account.address)

            txn = contract.functions.recordAudit(
                request_id,
                audit_hash,
                bool(consent_given),
                purpose,
            ).build_transaction(
                {
                    "from": account.address,
                    "nonce": nonce,
                    "gas": 300000,
                    "gasPrice": w3.to_wei("2", "gwei"),
                }
            )

            signed = account.sign_transaction(txn)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            return {
                "blockchain_enabled": True,
                "anchored": True,
                "status": "anchored",
                "tx_hash": tx_hash.hex(),
                "block_number": receipt.blockNumber,
                "network": self.rpc_url,
            }
        except Exception as exc:
            return {
                "blockchain_enabled": True,
                "anchored": False,
                "status": "error",
                "error": str(exc),
                "tx_hash": None,
                "network": self.rpc_url,
            }

    def fetch_audit(self, request_id: str) -> Dict[str, Any]:
        if not self.enabled:
            return {
                "blockchain_enabled": False,
                "found": False,
                "status": "disabled",
                "network": self.rpc_url,
            }

        try:
            from web3 import Web3  # noqa: F401
        except ImportError:
            return {
                "blockchain_enabled": True,
                "found": False,
                "status": "web3_missing",
                "network": self.rpc_url,
            }

        try:
            try:
                _, contract = self._get_contract()
            except ValueError:
                return {
                    "blockchain_enabled": True,
                    "found": False,
                    "status": "contract_address_missing",
                    "network": self.rpc_url,
                }
            except ConnectionError:
                return {
                    "blockchain_enabled": True,
                    "found": False,
                    "status": "rpc_unreachable",
                    "network": self.rpc_url,
                }

            record = contract.functions.getAudit(request_id).call()

            return {
                "blockchain_enabled": True,
                "found": True,
                "status": "found",
                "network": self.rpc_url,
                "record": {
                    "request_id": record[0],
                    "audit_hash": record[1],
                    "consent_given": bool(record[2]),
                    "purpose": record[3],
                    "timestamp": int(record[4]),
                    "sender": record[5],
                },
            }
        except Exception as exc:
            return {
                "blockchain_enabled": True,
                "found": False,
                "status": "error",
                "error": str(exc),
                "network": self.rpc_url,
            }

    def verify_audit(self, request_id: str, expected_hash: str) -> Dict[str, Any]:
        onchain = self.fetch_audit(request_id)
        if not onchain.get("found"):
            return {
                **onchain,
                "verified": False,
            }

        actual_hash = onchain["record"].get("audit_hash")
        verified = actual_hash == expected_hash

        return {
            **onchain,
            "verified": verified,
            "expected_hash": expected_hash,
            "actual_hash": actual_hash,
        }


blockchain_audit_service = BlockchainAuditService()
