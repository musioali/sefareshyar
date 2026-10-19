import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  Copy,
  Check,
  Send,
  Sparkles,
  ChevronRight,
  Gift,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Customer, Product, Seller } from '../types';
import { toPersianDigits } from '../utils/persianUtils';

interface RemindersViewProps {
  seller: Seller | null;
  customers: Customer[];
  products: Product[];
  onBack: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Show a customer as due a few days before the cycle ends, so the message lands before they run out
const DUE_EARLY_DAYS = 5;

export const RemindersView: React.FC<RemindersViewProps> = ({
  seller,
  customers,
  products,
  onBack,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const now = Date.now();
  const rows = customers
    .map((c) => {
      const cycle = products.find((p) => p.title === c.last_product_title)?.reorder_cycle_days;
      const daysSince = Math.max(0, Math.floor((now - new Date(c.last_order_at).getTime()) / DAY_MS));
      const daysLeft = cycle ? cycle - daysSince : undefined;
      const isDue = daysLeft !== undefined && daysLeft <= DUE_EARLY_DAYS;
      return { c, cycle, daysSince, daysLeft, isDue };
    })
    .sort((a, b) => Number(b.isDue) - Number(a.isDue) || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  const dueCount = rows.filter((r) => r.isDue).length;

  const shopUrl = seller
    ? `${window.location.origin}${window.location.pathname}#/s/${seller.handle}`
    : '';

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendSms = (phone: string, text: string) => {
    const clean = phone.replace(/\D/g, '');
    window.location.href = `sms:${clean}?&body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200">
        <button
          type="button"
          onClick={onBack}
          className="text-stone-600 font-bold flex items-center gap-1 hover:text-stone-900"
        >
          <ChevronRight className="w-4 h-4" />
          <span>بازگشت به منوی بیشتر</span>
        </button>
        <div className="flex items-center gap-1.5 font-bold text-stone-900">
          <Bell className="w-4 h-4 text-amber-600" />
          <span>یادآورهای هوشمند بازخرید و مناسبت‌ها</span>
        </div>
      </div>

      {/* Intro info box from PRD Section 1 */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-amber-950">
        <div className="flex items-center gap-1.5 font-bold text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span>حدود نیمی از فروش از مشتری‌های قبلی است</span>
        </div>
        <p className="text-xs leading-relaxed text-stone-700">
          در نظرسنجی ۲۰۰ فروشنده، به تخمین خودشان حدود نیمی از فروش از مشتری‌های قبلی بود، ولی ۸۳٪ هیچ فهرستی از آن‌ها نداشتند. اینجا مشتری‌هایی که موعد خرید دوباره‌شان رسیده بالای فهرست می‌آیند. موعد هر محصول را در تنظیمات محصول تعیین کنید.
        </p>
      </div>

      {/* Customers List for Re-order Reminders */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-800">
          {dueCount > 0
            ? `${toPersianDigits(dueCount)} مشتری موعد خرید دوباره‌شان رسیده`
            : 'فعلاً موعد خرید هیچ مشتری‌ای نرسیده'}
        </h3>

        {customers.length === 0 ? (
          <div className="p-6 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
            هنوز مشتری با سابقه خریدی در سیستم ثبت نشده است.
          </div>
        ) : (
          rows.map(({ c, cycle, daysSince, daysLeft, isDue }) => {
            const firstName = c.full_name.trim().split(' ')[0] || c.full_name;
            const productTitle = c.last_product_title || 'محصولات دست‌ساز';
            const reminderText = `سلام ${firstName} عزیز، ${seller?.shop_name} هستیم 🌸 ${toPersianDigits(daysSince)} روز پیش «${productTitle}» را از ما گرفتید. اگر تمام شده، با این لینک بدون نوشتن دوبارهٔ آدرس سفارش بدهید:\n${shopUrl}`;
            const isCopied = copiedId === c.customerId;
            const badge = isDue
              ? { text: 'موعد خرید دوباره', cls: 'text-emerald-800 bg-emerald-50' }
              : cycle
                ? { text: `${toPersianDigits(daysLeft ?? 0)} روز تا موعد`, cls: 'text-stone-600 bg-stone-100' }
                : { text: 'موعد تعریف نشده', cls: 'text-stone-500 bg-stone-100' };

            return (
              <div
                key={c.customerId}
                className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-stone-900">{c.full_name}</span>
                      <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded">
                        {toPersianDigits(c.orders_count)} خرید قبلی
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      آخرین خرید: <b>{productTitle}</b>، {toPersianDigits(daysSince)} روز پیش
                    </div>
                  </div>

                  <div className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${badge.cls}`}>
                    {badge.text}
                  </div>
                </div>

                {/* Pre-written Message Preview */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 text-xs leading-relaxed select-all">
                  {reminderText}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(c.customerId, reminderText)}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      isCopied
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-800'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'کپی شد!' : 'کپی متن برای دایرکت'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSms(c.phone, reminderText)}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال پیامک (SMS)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
