import { Order, OrderStatus } from '../types';
import { toPersianDigits } from '../utils/persianUtils';

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const appUrl = (hash: string) => `${window.location.origin}${window.location.pathname}${hash}`;
export const shopLink = (handle: string) => appUrl(`#/s/${handle}`);
export const trackLink = (orderId: string) => appUrl(`#/t/${orderId}`);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) return 'همین الان';
  if (diff < HOUR) return `${toPersianDigits(Math.floor(diff / MINUTE))} دقیقه پیش`;
  if (diff < DAY) return `${toPersianDigits(Math.floor(diff / HOUR))} ساعت پیش`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'دیروز';
  return `${toPersianDigits(days)} روز پیش`;
}

export function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

/** Seller-facing stages. Several machine statuses fold into one stage. */
export type Stage = 'new' | 'making' | 'ready' | 'sent';

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'new', label: 'تازه' },
  { id: 'making', label: 'در حال ساخت' },
  { id: 'ready', label: 'آمادهٔ ارسال' },
  { id: 'sent', label: 'ارسال‌شده' },
];

export function stageOf(status: OrderStatus): Stage | null {
  switch (status) {
    case 'submitted':
    case 'needs_info':
      return 'new';
    case 'confirmed':
    case 'in_production':
      return 'making';
    case 'packed':
      return 'ready';
    case 'shipped':
      return 'sent';
    default:
      return null;
  }
}

/** «تی‌شرت (M، قرمز)» for display: short product name plus picked options */
export function itemText(item: { title: string; options_selected?: Record<string, any> }): string {
  const values = Object.values(item.options_selected || {}).filter(Boolean);
  const name = shortTitle(item.title);
  return values.length ? `${name} (${values.join('، ')})` : name;
}

export function itemsSummary(order: Order): string {
  if (!order.items.length) return '';
  const first = order.items[0];
  const head = `${toPersianDigits(first.qty)} ${itemText(first)}`;
  const rest = order.items.length - 1;
  return rest > 0 ? `${head} و ${toPersianDigits(rest)} قلم دیگر` : head;
}

/** Drop parenthesised spec text so list rows stay on one line. */
export function shortTitle(title: string): string {
  return title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

/** Show enough of a saved address to recognise it, not enough to read it off a stranger's phone. */
export function maskAddress(city?: string, address?: string): string {
  const head = (address || '').split(/[،,]/)[0]?.trim() || '';
  return [city, head].filter(Boolean).join('، ') + '، …';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/** 6037 9918 2345 6789: spaces only, so it never wraps on a phone */
export const cardGroups = (card: string) => card.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
