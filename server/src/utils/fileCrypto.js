const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'secure-storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

function getKey() {
  const hex = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'DOCUMENT_ENCRYPTION_KEY is missing or not 32 bytes (64 hex chars). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

/** Encrypts a buffer with AES-256-GCM and writes it to secure-storage/. Returns { fileKey, iv, authTag }. */
function encryptToDisk(buffer, originalName) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const safeName = String(originalName || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const fileKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}.enc`;
  fs.writeFileSync(path.join(STORAGE_DIR, fileKey), encrypted);

  return { fileKey, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

/** Reads + decrypts a document previously written by encryptToDisk. */
function decryptFromDisk(fileKey, ivHex, authTagHex) {
  const key = getKey();
  const encrypted = fs.readFileSync(path.join(STORAGE_DIR, fileKey));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function deleteFromDisk(fileKey) {
  const p = path.join(STORAGE_DIR, fileKey);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

/** Last 4 characters visible, rest masked — for PAN/gov-ID numbers in list views. */
function maskValue(value) {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`;
}

module.exports = { encryptToDisk, decryptFromDisk, deleteFromDisk, maskValue, STORAGE_DIR };
