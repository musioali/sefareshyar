/**
 * Jalali (Solar Hijri) date utilities using jalaali-js
 */
import { toJalaali, toGregorian } from 'jalaali-js';
import { toPersianDigits } from './persianUtils';

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Convert ISO Gregorian date string to Jalali string like "۱۴۰۳/۰۷/۲۸"
export function formatToJalali(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const m = String(j.jm).padStart(2, '0');
    const day = String(j.jd).padStart(2, '0');
    return toPersianDigits(`${j.jy}/${m}/${day}`);
  } catch {
    return '';
  }
}

// Convert ISO Gregorian date string to descriptive Jalali text like "۲۸ مهر ۱۴۰۳"
export function formatToJalaliText(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const monthName = PERSIAN_MONTHS[j.jm - 1] || '';
    return `${toPersianDigits(j.jd)} ${monthName} ${toPersianDigits(j.jy)}`;
  } catch {
    return '';
  }
}

// Convert Jalali Y, M, D to ISO Gregorian string YYYY-MM-DD
export function jalaliToGregorianISO(jy: number, jm: number, jd: number): string {
  try {
    const g = toGregorian(jy, jm, jd);
    const m = String(g.gm).padStart(2, '0');
    const d = String(g.gd).padStart(2, '0');
    return `${g.gy}-${m}-${d}`;
  } catch {
    return '';
  }
}

// Get current Jalali date { jy, jm, jd }
export function getCurrentJalaliDate() {
  const now = new Date();
  return toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// Calculate days remaining between today and due date
export function getDaysRemaining(isoString?: string | null): number | null {
  if (!isoString) return null;
  try {
    const target = new Date(isoString);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// Check if a date violates min lead days
export function isBeforeMinLeadDays(isoDateString: string, minLeadDays: number): boolean {
  if (!minLeadDays || minLeadDays <= 0) return false;
  const days = getDaysRemaining(isoDateString);
  if (days === null) return false;
  return days < minLeadDays;
}

export { PERSIAN_MONTHS };
