const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEY_PATH = path.join(__dirname, '../data/.secret');

function getKey() {
  if (!fs.existsSync(KEY_PATH)) {
    fs.writeFileSync(KEY_PATH, crypto.randomBytes(32).toString('hex'), 'utf-8');
  }
  return Buffer.from(fs.readFileSync(KEY_PATH, 'utf-8').trim(), 'hex');
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(text) {
  const key = getKey();
  const sep = text.indexOf(':');
  const iv = Buffer.from(text.slice(0, sep), 'hex');
  const enc = Buffer.from(text.slice(sep + 1), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf-8');
}

// Returns true if the string looks like our iv:hex format
function isEncrypted(raw) {
  return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(raw.trim());
}

module.exports = { encrypt, decrypt, isEncrypted };
