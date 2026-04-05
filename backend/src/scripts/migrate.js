const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

console.log('Attempting connection to MSSQL...');
console.log('Host:', config.server);
console.log('Port:', config.port);
console.log('User:', config.user);
console.log('Database:', config.database);

async function migrate() {
    try {
        const pool = await sql.connect(config);
        console.log('✅ Connected to database');

        const tables = [
            {
                name: 'CitizenRegistration',
                query: `
          CREATE TABLE CitizenRegistration (
            id INT IDENTITY PRIMARY KEY,
            citizenId NVARCHAR(50) UNIQUE NOT NULL,
            fullName NVARCHAR(200) NOT NULL,
            nicNumber NVARCHAR(50) UNIQUE NOT NULL,
            dateOfBirth DATE,
            address NVARCHAR(500),
            phone NVARCHAR(20),
            email NVARCHAR(200) UNIQUE,
            passwordHash NVARCHAR(500),
            biometricHash NVARCHAR(500),
            faceImagePath NVARCHAR(500),
            status NVARCHAR(20) DEFAULT 'PENDING',
            rejectionReason NVARCHAR(500),
            did NVARCHAR(200),
            qrCode NVARCHAR(MAX),
            createdAt DATETIME DEFAULT GETDATE(),
            updatedAt DATETIME DEFAULT GETDATE()
          )
        `
            },
            {
                name: 'Notification',
                query: `
          CREATE TABLE Notification (
            id INT IDENTITY PRIMARY KEY,
            recipientId NVARCHAR(50) NOT NULL,
            recipientType NVARCHAR(20) NOT NULL,
            title NVARCHAR(200) NOT NULL,
            message NVARCHAR(1000) NOT NULL,
            type NVARCHAR(50) DEFAULT 'INFO',
            isRead BIT DEFAULT 0,
            createdAt DATETIME DEFAULT GETDATE()
          )
        `
            },
            {
                name: 'OrganizationUser',
                query: `
          CREATE TABLE OrganizationUser (
            id INT IDENTITY PRIMARY KEY,
            orgId NVARCHAR(50) UNIQUE NOT NULL,
            orgName NVARCHAR(200) NOT NULL,
            passwordHash NVARCHAR(500) NOT NULL,
            isActive BIT DEFAULT 1,
            createdAt DATETIME DEFAULT GETDATE()
          )
        `
            },
            {
                name: 'OrganizationRecord',
                query: `
          CREATE TABLE OrganizationRecord (
            id INT IDENTITY PRIMARY KEY,
            orgId NVARCHAR(50) NOT NULL,
            citizenId NVARCHAR(50) NOT NULL,
            recordType NVARCHAR(100) NOT NULL,
            recordTitle NVARCHAR(200) NOT NULL,
            recordData NVARCHAR(MAX) NOT NULL,
            addedAt DATETIME DEFAULT GETDATE()
          )
        `
            }
        ];

        for (const table of tables) {
            const checkResult = await pool.request().query(`
        SELECT * FROM sysobjects WHERE name='${table.name}' AND xtype='U'
      `);

            if (checkResult.recordset.length === 0) {
                console.log(`Creating table ${table.name}...`);
                await pool.request().query(table.query);
                console.log(`✅ Table ${table.name} created`);
            } else {
                console.log(`ℹ️ Table ${table.name} already exists`);
            }
        }

        console.log('🚀 Migration successful');
        await pool.close();
    } catch (err) {
        console.error('❌ Migration failed');
        if (err.code === 'ELOGIN') {
            console.error('Login failed. Please check your MSSQL_USER and MSSQL_PASSWORD in .env');
        } else {
            console.error(err);
        }
        process.exit(1);
    }
}

migrate();
