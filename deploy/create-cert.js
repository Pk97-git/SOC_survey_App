// Generate self-signed certificate for HTTPS
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'server.key');
const certPath = path.join(__dirname, 'server.cert');

// Generate key and certificate
const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
});

const key = keyPair.privateKey;
const cert = keyPair.publicKey;

fs.writeFileSync(keyPath, key);
fs.writeFileSync(certPath, cert);

console.log('Certificate generated:');
console.log('  Key:', keyPath);
console.log('  Cert:', certPath);
