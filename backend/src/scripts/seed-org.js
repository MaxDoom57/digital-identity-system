const sql = require('mssql');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT) || 1433,
    options: { encrypt: false, trustServerCertificate: true }
};

// Test org users — orgId is the login username, accessKey is the password
const seedOrgs = [
    { orgId: 'SAMPATH-BANK', orgName: 'Sampath Bank PLC', accessKey: 'Org@2025' },
    { orgId: 'MOH-HEALTH', orgName: 'Ministry of Health', accessKey: 'Org@2025' },
    { orgId: 'RDA-ROADS', orgName: 'Road Development Authority', accessKey: 'Org@2025' },
];

async function seed() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to database');

        for (const org of seedOrgs) {
            const passwordHash = await bcrypt.hash(org.accessKey, 10);
            await pool.request()
                .input('orgId', sql.NVarChar, org.orgId)
                .input('orgName', sql.NVarChar, org.orgName)
                .input('passwordHash', sql.NVarChar, passwordHash)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM OrganizationUser WHERE orgId = @orgId)
                        INSERT INTO OrganizationUser (orgId, orgName, passwordHash) VALUES (@orgId, @orgName, @passwordHash)
                    ELSE
                        PRINT 'Org ' + @orgId + ' already exists, skipping'
                `);
            console.log(`Seeded: ${org.orgId} (password: ${org.accessKey})`);
        }

        console.log('Seed complete');
        await pool.close();
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    }
}

seed();
