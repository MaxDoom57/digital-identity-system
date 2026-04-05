/**
 * Seed all OrganizationUser entries from MSSQL onto the blockchain orgpermission chaincode.
 * Run once to bring blockchain and MSSQL into sync.
 *   node src/scripts/seed-blockchain-orgs.js
 */
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { invokeChaincode } = require('../services/fabricService');

const dbConfig = {
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT) || 1433,
    options: { encrypt: false, trustServerCertificate: true }
};

// Default metadata for each org (sector + allowed fields)
const orgMeta = {
    'SAMPATH-BANK': { sector: 'Banking',      fields: ['FullName','DOB','NIC','Address'] },
    'MOH-HEALTH':   { sector: 'Healthcare',   fields: ['FullName','DOB','NIC'] },
    'RDA-ROADS':    { sector: 'Government',   fields: ['FullName','NIC','Address'] },
};

async function run() {
    const pool = await sql.connect(dbConfig);
    console.log('Connected to MSSQL');

    const result = await pool.request()
        .query('SELECT orgId, orgName FROM OrganizationUser WHERE isActive = 1');
    const orgs = result.recordset;
    console.log(`Found ${orgs.length} orgs in MSSQL:`, orgs.map(o => o.orgId));

    for (const org of orgs) {
        const meta = orgMeta[org.orgId] || { sector: 'Government', fields: ['FullName', 'NIC'] };
        try {
            await invokeChaincode('orgpermission', 'RegisterOrganization', [
                org.orgId,
                org.orgName,
                meta.sector,
                JSON.stringify(meta.fields),
                'admin'
            ]);
            console.log(`✅ Registered on blockchain: ${org.orgId} (${org.orgName})`);
        } catch (err) {
            if (err.message && err.message.includes('already exists')) {
                console.log(`ℹ️  Already on blockchain: ${org.orgId}`);
            } else {
                console.error(`❌ Failed for ${org.orgId}:`, err.message);
            }
        }
    }

    await pool.close();
    console.log('Done.');
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
