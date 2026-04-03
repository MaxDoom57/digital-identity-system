'use strict';

/**
 * Workload: Audit Log Write (write path)
 * Chaincode: audit
 * Function:  LogEvent(eventId, citizenId, orgId, eventType, fieldsJSON, isOffline, timestamp)
 *
 * Every transaction writes a new, unique audit event.  Because the composite
 * key is AUDIT_{citizenId}_{eventId} and eventId is a UUID, there are NO
 * write-write conflicts regardless of concurrency — this is the best-case
 * write scenario and sets an upper-bound TPS for the audit chaincode.
 *
 * Event types cycle through realistic values so the benchmark reflects
 * actual system usage patterns documented in the thesis.
 */

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { v4: uuidv4 } = require('uuid');

const CITIZEN_POOL  = 200;
const ORG_POOL      = 20;

const EVENT_TYPES = [
    'RECORD_ADDED',
    'IDENTITY_VERIFIED',
    'CONSENT_GRANTED',
    'CONSENT_REVOKED',
    'FIELD_ACCESSED',
    'OFFLINE_VERIFY',
];

const FIELD_SETS = [
    '[]',
    '["fullName"]',
    '["fullName","nicNumber"]',
    '["nicNumber","dateOfBirth","address"]',
    '["fullName","email","phone"]',
];

class AuditLogWriteWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.txCounter   = 0;
        this.workerIndex = 0;
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex = workerIndex;
        this.txCounter   = 0;
    }

    async submitTransaction() {
        const idx       = this.txCounter++;
        const eventId   = uuidv4();                                     // globally unique — no MVCC conflict
        const citizenId = `BENCH-CIT-${String(idx % CITIZEN_POOL).padStart(4, '0')}`;
        const orgId     = `BENCH-ORG-${String(idx % ORG_POOL).padStart(2, '0')}`;
        const eventType = EVENT_TYPES[idx % EVENT_TYPES.length];
        const fields    = FIELD_SETS[idx % FIELD_SETS.length];
        const isOffline = (idx % 10 === 0) ? 'true' : 'false';         // 10 % offline events
        const timestamp = String(Math.floor(Date.now() / 1000));

        const request = {
            contractId: 'audit',
            contractFunction: 'LogEvent',
            contractArguments: [eventId, citizenId, orgId, eventType, fields, isOffline, timestamp],
            readOnly: false,
        };

        await this.sutAdapter.sendRequests(request);
    }

    async cleanupWorkloadModule() {
        // Audit log is append-only — no cleanup.
    }
}

function createWorkloadModule() {
    return new AuditLogWriteWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
