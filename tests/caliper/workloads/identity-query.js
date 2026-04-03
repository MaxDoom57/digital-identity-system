'use strict';

/**
 * Workload: Identity Query (read path)
 * Chaincode: identity
 * Function:  GetIdentity(did string)
 *
 * Each worker picks a DID from the pre-seeded pool and issues a Fabric
 * evaluateTransaction (peer query, no ordering).  Measures pure ledger
 * read throughput — the fastest path in the system.
 *
 * Seed requirement:
 *   At least POOL_SIZE identities must exist on identitychannel before
 *   running this workload.  Use the seed-ledger.js helper or approve
 *   citizens through the admin portal first.
 */

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

// DIDs created by seed-ledger.js (or manually approved citizens).
// Caliper workers round-robin through this pool so every transaction
// targets a distinct key, avoiding single-key hotspot contention.
const POOL_SIZE = 200;
const DID_PREFIX = 'did:fabric:BENCH';

class IdentityQueryWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.dids = [];
        this.roundIdx = 0;
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Build a DID pool spread evenly across workers so workers don't
        // all query the same keys simultaneously.
        this.dids = [];
        for (let i = workerIndex; i < POOL_SIZE; i += totalWorkers) {
            this.dids.push(`${DID_PREFIX}${String(i).padStart(4, '0')}`);
        }

        // Fallback: if somehow no DIDs assigned to this worker, use full pool.
        if (this.dids.length === 0) {
            for (let i = 0; i < POOL_SIZE; i++) {
                this.dids.push(`${DID_PREFIX}${String(i).padStart(4, '0')}`);
            }
        }
        this.roundIdx = 0;
    }

    async submitTransaction() {
        const did = this.dids[this.roundIdx % this.dids.length];
        this.roundIdx++;

        const request = {
            contractId: 'identity',
            contractFunction: 'GetIdentity',
            contractArguments: [did],
            // evaluateTransaction = query only (no ordering, fastest path)
            readOnly: true,
        };

        await this.sutAdapter.sendRequests(request);
    }

    async cleanupWorkloadModule() {
        // No cleanup needed for a read-only workload.
    }
}

function createWorkloadModule() {
    return new IdentityQueryWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
