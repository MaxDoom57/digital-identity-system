'use strict';

/**
 * Ledger Seeder — run ONCE before any benchmark round.
 *
 * Creates POOL_SIZE digital identities on identitychannel so that:
 *   - identity-query.js has real DIDs to read (no "key not found" errors)
 *   - consent-grant.js has valid citizen keys to write consent against
 *   - audit-log-write.js references real citizenIds (cosmetic — audit
 *     doesn't validate citizenId existence, but realistic data is better)
 *
 * Usage (from tests/caliper/):
 *   node workloads/seed-ledger.js
 *
 * Requires the Fabric SDK environment to already be bootstrapped (network up,
 * channel created, chaincodes installed).  The script re-uses the same
 * connection profile as Caliper itself.
 */

const { connect, hash } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const POOL_SIZE   = 200;
const CHANNEL     = 'identitychannel';
const CHAINCODE   = 'identity';
const CRYPTO_BASE = '/mnt/e/digital-identity-system/blockchain/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com';
const PEER_ENDPOINT = 'localhost:7051';
const MSP_ID        = 'Org1MSP';

async function newGrpcConnection() {
    const tlsCert = fs.readFileSync(path.join(CRYPTO_BASE, 'peers/peer0.org1.example.com/tls/ca.crt'));
    const tlsCreds = grpc.credentials.createSsl(tlsCert);
    return new grpc.Client(PEER_ENDPOINT, tlsCreds, {
        'grpc.ssl_target_name_override': 'peer0.org1.example.com',
    });
}

function loadAdminIdentity() {
    const certDir  = path.join(CRYPTO_BASE, 'users/Admin@org1.example.com/msp/signcerts');
    const keyDir   = path.join(CRYPTO_BASE, 'users/Admin@org1.example.com/msp/keystore');
    const certFile = fs.readdirSync(certDir).find(f => f.endsWith('.pem')) || 'cert.pem';
    const keyFile  = fs.readdirSync(keyDir).find(f => f.endsWith('_sk') || f === 'priv_sk');
    return {
        credentials: fs.readFileSync(path.join(certDir, certFile)),
        privateKey:  fs.readFileSync(path.join(keyDir, keyFile)),
    };
}

async function main() {
    const grpcClient = await newGrpcConnection();
    const { credentials, privateKey } = loadAdminIdentity();

    const client = connect({
        client: grpcClient,
        identity: { mspId: MSP_ID, credentials },
        signer: async (digest) => {
            const key = crypto.createPrivateKey(privateKey);
            return crypto.sign(null, Buffer.from(digest), key);
        },
        hash: hash.sha256,
    });

    try {
        const network  = client.getNetwork(CHANNEL);
        const contract = network.getContract(CHAINCODE);

        console.log(`Seeding ${POOL_SIZE} identities on channel '${CHANNEL}'...`);
        let created = 0;
        let skipped = 0;

        for (let i = 0; i < POOL_SIZE; i++) {
            const citizenId     = `BENCH${String(i).padStart(4, '0')}`;
            const did           = `did:fabric:${citizenId}`;
            const fullName      = `Benchmark Citizen ${i}`;
            const nicNumber     = `NIC${String(i).padStart(9, '0')}`;
            const biometricHash = crypto.createHash('sha256').update(`biometric-${i}`).digest('hex');
            const ipfsCid       = '';

            try {
                await contract.submitTransaction('CreateIdentity',
                    citizenId, did, fullName, nicNumber, biometricHash, ipfsCid);
                created++;
                if (created % 20 === 0) process.stdout.write(`  ${created} / ${POOL_SIZE}\r`);
            } catch (err) {
                // Already exists — skip silently
                if (err.message && err.message.includes('already exists')) {
                    skipped++;
                } else {
                    console.error(`  Failed on ${citizenId}: ${err.message}`);
                }
            }
        }

        console.log(`\nDone. Created: ${created}  Skipped (already existed): ${skipped}`);
    } finally {
        client.close();
        grpcClient.close();
    }
}

main().catch(err => { console.error(err); process.exit(1); });
