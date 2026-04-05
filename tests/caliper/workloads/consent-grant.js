'use strict';

/**
 * Workload: Consent Grant (write path)
 * Chaincode: consent
 * Function:  GrantPermission(citizenId, orgId, fieldsJSON)
 *
 * Each transaction writes a new consent record to the ledger and goes
 * through full ordering + commit.  This is the write-path benchmark that
 * exercises endorsement, ordering, and commit latency together.
 *
 * To avoid MVCC conflicts (multiple transactions updating the same key in
 * the same block) each worker uses a distinct (citizenId, orgId) pair so
 * no two in-flight transactions touch the same ledger key.
 *
 * Seed requirement:
 *   BENCH_CITIZEN_POOL citizens and BENCH_ORG_POOL orgs must be registered
 *   on-chain before running.  Use seed-ledger.js or the admin portal.
 */

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { v4: uuidv4 } = require('uuid');

const CITIZEN_POOL = 200;   // distinct citizenId values
const ORG_POOL     = 20;    // distinct orgId values

const FIELDS_OPTIONS = [
    ['fullName'],
    ['fullName', 'nicNumber'],
    ['fullName', 'nicNumber', 'dateOfBirth'],
    ['fullName', 'email'],
    ['nicNumber', 'address', 'phone'],
];

class ConsentGrantWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.txCounter = 0;
        this.workerIndex = 0;
        this.totalWorkers = 1;
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex   = workerIndex;
        this.totalWorkers  = totalWorkers;
        this.txCounter     = 0;
    }

    async submitTransaction() {
        // Each worker operates on a disjoint slice of the citizen pool.
        // Within its slice it cycles through orgs so the same (citizen, org)
        // pair is not written twice in rapid succession (reduces MVCC conflicts).
        const citizenOffset = (this.workerIndex * Math.ceil(CITIZEN_POOL / this.totalWorkers)) % CITIZEN_POOL;
        const citizenIndex  = (citizenOffset + Math.floor(this.txCounter / ORG_POOL)) % CITIZEN_POOL;
        const orgIndex      = this.txCounter % ORG_POOL;

        const citizenId = `BENCH-CIT-${String(citizenIndex).padStart(4, '0')}`;
        const orgId     = `BENCH-ORG-${String(orgIndex).padStart(2, '0')}`;
        const fields    = FIELDS_OPTIONS[this.txCounter % FIELDS_OPTIONS.length];

        this.txCounter++;

        const request = {
            contractId: 'consent',
            contractFunction: 'GrantPermission',
            contractArguments: [citizenId, orgId, JSON.stringify(fields)],
            readOnly: false,
        };

        await this.sutAdapter.sendRequests(request);
    }

    async cleanupWorkloadModule() {
        // Optionally revoke all granted consents to reset ledger state.
        // Disabled by default so successive benchmark runs accumulate state
        // and reflect realistic ledger growth.
    }
}

function createWorkloadModule() {
    return new ConsentGrantWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
