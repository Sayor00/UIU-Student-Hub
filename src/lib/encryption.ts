import crypto from 'crypto';

// The key should be 32 bytes (256 bits) for AES-256. 
// It's fetched from environment variables or falls back to a deterministic hash of a fallback string (only for dev).
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development-only-1234';
  return crypto.createHash('sha256').update(secret).digest();
};

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(12); // 96-bit IV
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData || typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
    return encryptedData;
  }
  
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedText = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed');
    return '';
  }
}
