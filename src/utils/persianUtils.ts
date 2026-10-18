/**
 * Utility functions for Persian digits, formatting, currency, and phone validation.
 */

// Convert Persian and Arabic digits to English/Latin digits
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .trim();
}

// Convert English digits to Persian digits for display
export function toPersianDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const str = String(num);
  return str.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1728));
}

// Format currency in Tomans with Persian digits and separator (٬)
export function formatToman(amount: number | string | undefined | null): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '۰ تومان';
  const num = Math.round(Number(amount));
  const parts = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${toPersianDigits(parts)} تومان`;
}

// Normalize phone number to 11 digits format (e.g. 09123456789)
export function normalizePhone(input: string): string {
  const digits = toEnglishDigits(input).replace(/\D/g, '');
  if (digits.startsWith('98')) {
    return '0' + digits.substring(2);
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    return '0' + digits;
  }
  return digits;
}

// Validate Iranian mobile phone (09xxxxxxxxx)
export function isValidIranPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^09\d{9}$/.test(normalized);
}

// Validate Iran Post 20-digit tracking barcode
export function isValidPostTrackingCode(code: string): boolean {
  const digits = toEnglishDigits(code).replace(/\D/g, '');
  return /^\d{20}$/.test(digits);
}

// Format card number with chunks of 4 digits
export function formatCardNumber(card: string): string {
  const digits = toEnglishDigits(card).replace(/\D/g, '');
  const chunks = digits.match(/.{1,4}/g);
  return chunks ? chunks.join(' - ') : digits;
}

// Safe hash for customer hint ID (sellerId:phone) using Web Crypto API SHA-256 with fallback
export async function hashCustomerIdentifier(sellerId: string, phone: string): Promise<string> {
  const normalizedPhone = normalizePhone(phone);
  const text = `${sellerId}:${normalizedPhone}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback simple deterministic hash
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

// Generate random readable short code (e.g. "K7M2Q")
export function generateShortCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random ID token
export function generateRandomToken(length = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
