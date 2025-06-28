import { jwtDecode } from 'jwt-decode';

// Keys used for storing authentication data
export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_INFO_KEY = 'auth_user_info';

// Secret encryption key for user data (in production, use environment variables)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'secure-app-key-2025';

/**
 * Interface for decoded JWT token
 */
export interface DecodedToken {
  exp: number;           // Expiration timestamp (in seconds)
  sub: string;           // Subject (usually user ID)
  name?: string;         // Optional user name
  roles?: string[];      // Optional roles array
  iat?: number;          // Issued at timestamp
  [key: string]: any;    // Allow for additional custom claims
}

/**
 * Derives an encryption key from a string using PBKDF2
 * @param keyString - String to derive key from
 * @returns CryptoKey for use with AES-GCM
 */
async function deriveKey(keyString: string, salt: Uint8Array): Promise<CryptoKey> {
  // Convert string to ArrayBuffer
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(keyString),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive an AES-GCM key using PBKDF2
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts user data using AES-GCM with the Web Crypto API
 * @param data - Data to encrypt
 * @returns Promise resolving to encrypted string (format: base64(iv):base64(salt):base64(data))
 */
export async function encryptUserData(data: any): Promise<string> {
  if (typeof window === 'undefined' || !data) return '';
  
  try {
    // Convert data to string if it's not already
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Generate a random 16-byte salt for key derivation
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // Generate a random 12-byte IV for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Get the encryption key
    const key = await deriveKey(ENCRYPTION_KEY, salt);
    
    // Encrypt the data
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encoder.encode(dataStr)
    );
    
    // Convert to base64 and format the output
    const encryptedArray = new Uint8Array(encrypted);
    let encryptedStr = '';
    for (let i = 0; i < encryptedArray.length; i++) {
      encryptedStr += String.fromCharCode(encryptedArray[i]);
    }
    const encryptedBase64 = btoa(encryptedStr);
    
    let ivStr = '';
    for (let i = 0; i < iv.length; i++) {
      ivStr += String.fromCharCode(iv[i]);
    }
    const ivBase64 = btoa(ivStr);
    
    let saltStr = '';
    for (let i = 0; i < salt.length; i++) {
      saltStr += String.fromCharCode(salt[i]);
    }
    const saltBase64 = btoa(saltStr);
    
    return `${ivBase64}:${saltBase64}:${encryptedBase64}`;
  } catch (error) {
    console.error('Error encrypting user data:', error);
    return '';
  }
}

/**
 * Decrypts user data using AES-GCM with the Web Crypto API
 * @param encryptedData - Encrypted string in format: base64(iv):base64(salt):base64(data)
 * @returns Promise resolving to decrypted data as object or null if invalid
 */
export async function decryptUserData(encryptedData: string | null): Promise<any> {
  if (typeof window === 'undefined' || !encryptedData) return null;
  
  try {
    // First split the encrypted data to get the base64 components
    const [ivBase64, saltBase64, dataBase64] = encryptedData.split(':');
    
    if (!ivBase64 || !saltBase64 || !dataBase64) {
      // Check if this might be data from the old format
      if (encryptedData.includes(':') && encryptedData.split(':').length === 2) {
        console.warn('Found data in old encryption format. User should re-login.');
        return null;
      }
      throw new Error('Invalid encrypted data format');
    }
    
    if (!ivBase64 || !saltBase64 || !dataBase64) {
      // Check if this might be data from the old format
      if (encryptedData.includes(':') && encryptedData.split(':').length === 2) {
        console.warn('Found data in old encryption format. User should re-login.');
        return null;
      }
      throw new Error('Invalid encrypted data format');
    }
    
    // Convert base64 strings back to Uint8Arrays
    const ivStr = atob(ivBase64);
    const iv = new Uint8Array(ivStr.length);
    for (let i = 0; i < ivStr.length; i++) {
      iv[i] = ivStr.charCodeAt(i);
    }
    
    const saltStr = atob(saltBase64);
    const salt = new Uint8Array(saltStr.length);
    for (let i = 0; i < saltStr.length; i++) {
      salt[i] = saltStr.charCodeAt(i);
    }
    
    const encryptedStr = atob(dataBase64);
    const encryptedData2 = new Uint8Array(encryptedStr.length);
    for (let i = 0; i < encryptedStr.length; i++) {
      encryptedData2[i] = encryptedStr.charCodeAt(i);
    }
    // Convert the decrypted data back to a string and parse it
    // Derive the key using the salt
    const key = await deriveKey(ENCRYPTION_KEY, salt);
    
    // Decrypt the data
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedData2
    );
    
    // Convert the decrypted data back to a string and parse it
    const decoder = new TextDecoder();
    const decryptedStr = decoder.decode(decrypted);
    
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Error decrypting user data:', error);
    return null;
  }
}

/**
 * Securely stores user info in localStorage with encryption
 * @param userInfo - User information to store
 * @returns Promise resolving when storage is complete
 */
export async function secureStoreUserInfo(userInfo: any): Promise<void> {
  if (typeof window === 'undefined' || !userInfo) return;
  
  try {
    const encrypted = await encryptUserData(userInfo);
    if (!encrypted) {
      console.error('Failed to encrypt user info - not storing data');
      return;
    }
    localStorage.setItem(AUTH_USER_INFO_KEY, encrypted);
  } catch (error) {
    console.error('Error securely storing user info:', error);
    // Do not fallback to unencrypted storage
    // Just log the error and don't store anything
  }
}

/**
 * Securely retrieves user info from localStorage with decryption
 * @returns Promise resolving to decrypted user info or null if not found
 */
export async function secureGetUserInfo(): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  try {
    const encrypted = localStorage.getItem(AUTH_USER_INFO_KEY);
    if (!encrypted) return null;
    
    // Try to decrypt it
    const decrypted = await decryptUserData(encrypted);
    
    // If decryption fails, check if it's plain JSON (old format)
    if (decrypted === null && encrypted.startsWith('{')) {
      try {
        // If it's unencrypted JSON, parse it
        return JSON.parse(encrypted);
      } catch {
        return null;
      }
    }
    
    return decrypted;
  } catch (error) {
    console.error('Error securely retrieving user info:', error);
    return null;
  }
}

/**
 * Decodes a JWT token and returns the payload
 * @param token - JWT token to decode
 * @returns Decoded token payload or null if invalid
 */
export function decodeToken(token: string | null): DecodedToken | null {
  if (!token) return null;
  
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Checks if a token is expired
 * @param token - JWT token to check
 * @returns True if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Checks if a token will expire within the specified minutes
 * @param token - JWT token to check
 * @param minutes - Number of minutes to check ahead
 * @returns True if token will expire within specified minutes
 */
export function willTokenExpireSoon(token: string | null, minutes: number = 5): boolean {
  if (!token) return true;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const warningTime = currentTime + (minutes * 60);
    
    return decoded.exp < warningTime;
  } catch (error) {
    console.error('Error checking if token expires soon:', error);
    return true;
  }
}

/**
 * Gets remaining token lifetime in seconds
 * @param token - JWT token to check
 * @returns Seconds until token expiration (0 if expired)
 */
export function getTokenRemainingTime(token: string | null): number {
  if (!token) return 0;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    
    return remainingTime > 0 ? remainingTime : 0;
  } catch (error) {
    console.error('Error calculating token remaining time:', error);
    return 0;
  }
}

/**
 * Extracts user roles from token if available
 * @param token - JWT token to extract roles from
 * @returns Array of role strings or empty array if none
 */
export function getUserRoles(token: string | null): string[] {
  if (!token) return [];
  
  try {
    const decoded = decodeToken(token);
    if (!decoded) return [];
    
    // Check multiple possible locations/formats for roles in the token
    // if (decoded.roles && Array.isArray(decoded.roles)) {
    //   return decoded.roles;
    // }
    
    // Check Hasura-specific role format
    if (decoded['https://hasura.io/jwt/claims']['x-hasura-default-role']) {
      return [decoded['https://hasura.io/jwt/claims']['x-hasura-default-role']];
    }
    
    // Check for 'rol' field that might be used
    if (decoded.rol) {
      return [decoded.rol];
    }
    
    // Check for allowed_roles field
    if (decoded['x-hasura-allowed-roles'] && Array.isArray(decoded['x-hasura-allowed-roles'])) {
      return decoded['x-hasura-allowed-roles'];
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting user roles:', error);
    return [];
  }
}

/**
 * Checks if auth is present in local storage
 * @returns True if both token and user info exist in storage
 */
export function hasPersistedAuth(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const userInfo = localStorage.getItem(AUTH_USER_INFO_KEY);
  
  return !!(token && userInfo && !isTokenExpired(token));
}

/**
 * Clears all auth data from local storage
 */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_INFO_KEY);
}