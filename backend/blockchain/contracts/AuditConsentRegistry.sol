// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AuditConsentRegistry {
    struct AuditRecord {
        string requestId;
        string auditHash;
        bool consentGiven;
        string purpose;
        uint256 timestamp;
        address sender;
    }

    mapping(string => AuditRecord) private records;
    string[] private requestIndex;

    event AuditRecorded(
        string indexed requestId,
        string auditHash,
        bool consentGiven,
        string purpose,
        uint256 timestamp,
        address indexed sender
    );

    function recordAudit(
        string calldata requestId,
        string calldata auditHash,
        bool consentGiven,
        string calldata purpose
    ) external {
        require(bytes(requestId).length > 0, "requestId required");
        require(bytes(auditHash).length > 0, "auditHash required");

        bool isNew = records[requestId].timestamp == 0;

        records[requestId] = AuditRecord({
            requestId: requestId,
            auditHash: auditHash,
            consentGiven: consentGiven,
            purpose: purpose,
            timestamp: block.timestamp,
            sender: msg.sender
        });

        if (isNew) {
            requestIndex.push(requestId);
        }

        emit AuditRecorded(requestId, auditHash, consentGiven, purpose, block.timestamp, msg.sender);
    }

    function getAudit(string calldata requestId) external view returns (AuditRecord memory) {
        require(records[requestId].timestamp != 0, "record not found");
        return records[requestId];
    }

    function totalRecords() external view returns (uint256) {
        return requestIndex.length;
    }
}
