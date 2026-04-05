const { connect, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CRYPTO_PATH = process.env.FABRIC_CRYPTO_PATH;
const CHANNEL = process.env.FABRIC_CHANNEL || 'identitychannel';
const MSP_ID = process.env.FABRIC_MSP_ID || 'Org1MSP';
const PEER_ENDPOINT = process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051';
const PEER_HOST_ALIAS = process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com';

const ORG1_PATH = path.join(CRYPTO_PATH, 'peerOrganizations/org1.example.com');
const CERT_PATH = path.join(ORG1_PATH, 'users/Admin@org1.example.com/msp/signcerts');
const KEY_PATH = path.join(ORG1_PATH, 'users/Admin@org1.example.com/msp/keystore');
const TLS_CERT_PATH = path.join(ORG1_PATH, 'peers/peer0.org1.example.com/tls/ca.crt');

let gateway = null;

async function getGateway() {
    if (gateway) return gateway;

    const tlsCert = fs.readFileSync(TLS_CERT_PATH);
    const credentials = grpc.credentials.createSsl(tlsCert);

    const grpcClient = new grpc.Client(PEER_ENDPOINT, credentials, {
        'grpc.ssl_target_name_override': PEER_HOST_ALIAS
    });

    const certFiles = fs.readdirSync(CERT_PATH);
    const cert = fs.readFileSync(path.join(CERT_PATH, certFiles[0]));

    const keyFiles = fs.readdirSync(KEY_PATH);
    const privateKeyPem = fs.readFileSync(path.join(KEY_PATH, keyFiles[0]));
    const privateKey = crypto.createPrivateKey(privateKeyPem);

    gateway = connect({
        client: grpcClient,
        identity: { mspId: MSP_ID, credentials: cert },
        signer: signers.newPrivateKeySigner(privateKey),
    });

    return gateway;
}

async function invokeChaincode(chaincodeName, functionName, args) {
    const gw = await getGateway();
    const network = gw.getNetwork(CHANNEL);
    const contract = network.getContract(chaincodeName);
    const result = await contract.submitTransaction(functionName, ...args);
    return result.toString();
}

async function queryChaincode(chaincodeName, functionName, args) {
    const gw = await getGateway();
    const network = gw.getNetwork(CHANNEL);
    const contract = network.getContract(chaincodeName);
    const result = await contract.evaluateTransaction(functionName, ...args);
    const resultString = Buffer.from(result).toString('utf8');
    try {
        return JSON.parse(resultString);
    } catch (e) {
        return resultString;
    }
}

module.exports = { invokeChaincode, queryChaincode };
