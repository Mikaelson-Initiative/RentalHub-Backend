import crypto from "crypto";

// Requires a 32-byte (64-character hex) key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text; // Fallback if key is not configured
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || !text.includes(":")) return text; // Not encrypted or fallback
  
  try {
    const parts = text.split(":");
    if (parts.length !== 3) return text;
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (e) {
    console.error("Decryption failed", e);
    return text; // Return original if decryption fails
  }
}
