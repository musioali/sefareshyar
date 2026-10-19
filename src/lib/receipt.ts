import { formatToman, toPersianDigits } from '../utils/persianUtils';

/**
 * A drawn card-to-card receipt, used by the sample shop so its orders have a slip
 * to look at and testers can finish an order without a real bank receipt.
 */
export function sampleReceiptDataUrl(amount: number, holder: string, time: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840">
  <rect width="600" height="840" fill="#ffffff"/>
  <rect width="600" height="150" fill="#0f6e74"/>
  <text x="300" y="92" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="38" font-weight="700" fill="#ffffff">رسید انتقال وجه</text>
  <text x="300" y="250" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#6b7280">مبلغ</text>
  <text x="300" y="310" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="44" font-weight="700" fill="#111827">${formatToman(amount)}</text>
  <line x1="60" y1="370" x2="540" y2="370" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="8 8"/>
  <text x="540" y="440" text-anchor="end" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#6b7280">به نام</text>
  <text x="60" y="440" text-anchor="start" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#111827">${holder}</text>
  <text x="540" y="510" text-anchor="end" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#6b7280">ساعت</text>
  <text x="60" y="510" text-anchor="start" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#111827">${toPersianDigits(time)}</text>
  <text x="540" y="580" text-anchor="end" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" fill="#6b7280">وضعیت</text>
  <text x="60" y="580" text-anchor="start" font-family="Vazirmatn, Tahoma, sans-serif" font-size="26" font-weight="700" fill="#0f6e74">موفق</text>
  <text x="300" y="760" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="22" fill="#9ca3af">فیش نمونه</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const nowClock = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
