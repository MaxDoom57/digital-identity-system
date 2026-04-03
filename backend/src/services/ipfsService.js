// IPFS Service — stores encrypted biometric templates
// Uses local IPFS node if available, falls back to hash-only mode for development

async function storeOnIPFS(data) {
    try {
        const { create } = await import('kubo-rpc-client');
        const client = create({ url: 'http://127.0.0.1:5002/api/v0' });
        const result = await client.add(JSON.stringify(data));
        return { cid: result.cid.toString(), success: true };
    } catch (err) {
        // Development fallback — generate deterministic mock CID
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
        const mockCid = `Qm${hash.substring(0, 44)}`;
        return { cid: mockCid, success: true, mock: true };
    }
}

async function retrieveFromIPFS(cid) {
    try {
        const { create } = await import('kubo-rpc-client');
        const client = create({ url: 'http://127.0.0.1:5002/api/v0' });
        const chunks = [];
        for await (const chunk of client.cat(cid)) {
            chunks.push(chunk);
        }
        const data = Buffer.concat(chunks).toString();
        return { data: JSON.parse(data), success: true };
    } catch (err) {
        return { error: 'IPFS retrieval failed — node not available', success: false };
    }
}

module.exports = { storeOnIPFS, retrieveFromIPFS };
