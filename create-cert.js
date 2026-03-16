const fs = require('fs');
const forge = require('node-forge');

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{ name: 'commonName', value: 'localhost' }];
cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] }
]);

cert.sign(keys.privateKey, forge.md.sha256.create());

const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync('C:\\nginx\\nginx-1.24.0\\conf\\server.crt', certPem);
fs.writeFileSync('C:\\nginx\\nginx-1.24.0\\conf\\server.key', keyPem);

console.log('Certificate created successfully!');
