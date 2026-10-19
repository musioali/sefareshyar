import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Users,
  ShoppingBag,
} from 'lucide-react';
import { Order, AppEvent, Seller } from '../types';
import { dataService } from '../services/dataService';
import { formatToman, toPersianDigits } from '../utils/persianUtils';

interface AnalyticsDashboardViewProps {
  seller: Seller | null;
  orders: Order[];
  onBack: () => void;
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  seller,
  orders,
  onBack,
}) => {
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      if (seller) {
        const evts = await dataService.listEvents(seller.sellerId);
        setEvents(evts);
      }
    }
    fetchEvents();
  }, [seller]);

  // Funnel calculations: only events actually logged, never padded
  const formOpenedCount = events.filter((e) => e.type === 'form_opened').length;
  const phoneEnteredCount = events.filter((e) => e.type === 'phone_entered').length;
  const orderSubmittedCount = events.filter((e) => e.type === 'order_submitted').length;
  const hasFunnelData = formOpenedCount > 0;
  const funnelWidth = (n: number) => (hasFunnelData ? Math.min(100, (n / formOpenedCount) * 100) : 0);

  const conversionRate = hasFunnelData ? Math.round((orderSubmittedCount / formOpenedCount) * 100) : 0;

  // Customers who checked their order status themselves instead of asking in DM
  const statusViewsCount = events.filter((e) => e.type === 'status_page_viewed').length;

  // Orders placed by a phone number that already had an earlier order
  const seenPhones = new Set<string>();
  let returningOrdersCount = 0;
  [...orders]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .forEach((o) => {
      if (seenPhones.has(o.phone)) returningOrdersCount += 1;
      seenPhones.add(o.phone);
    });

  // Revenue metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const averageOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Unprocessed orders (> 24 hours in submitted)
  const pendingOrders = orders.filter((o) => o.status === 'submitted');
  const now = new Date().getTime();
  const unresolvedStaleCount = pendingOrders.filter((o) => {
    const createdTime = new Date(o.created_at).getTime();
    return now - createdTime > 24 * 3600 * 1000;
  }).length;

  const stalePercent = orders.length > 0 ? Math.round((unresolvedStaleCount / orders.length) * 100) : 0;

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
          <BarChart3 className="w-4 h-4 text-brand-600" />
          <span>آمار و معیارهای موفقیت</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 block">کل فروش ثبت‌شده:</span>
          <span className="text-base font-extrabold text-stone-900 block">
            {formatToman(totalRevenue)}
          </span>
          <span className="text-xs text-emerald-700 font-semibold">
            میانگین: {formatToman(averageOrderValue)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 block">نرخ تکمیل فرم (تبدیل):</span>
          <span className="text-base font-extrabold text-brand-800 block">
            {hasFunnelData ? `${toPersianDigits(conversionRate)}٪` : '—'}
          </span>
          <span className="text-xs text-stone-500">
            {hasFunnelData
              ? `هدف: ۵۰٪ (${conversionRate >= 50 ? 'رسیده' : 'هنوز نرسیده'})`
              : 'هنوز کسی لینک را باز نکرده'}
          </span>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <h3 className="font-bold text-stone-900">قیف تبدیل مشتری در دایرکت:</h3>

        <div className="space-y-2.5">
          {/* Stage 1 */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
              <span>۱. بازکردن لینک فروشگاه از دایرکت:</span>
              <span className="">{toPersianDigits(formOpenedCount)} نفر</span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div className="bg-brand-500 h-full rounded-full" style={{ width: `${funnelWidth(formOpenedCount)}%` }} />
            </div>
          </div>

          {/* Stage 2 */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
              <span>۲. وارد کردن شماره موبایل:</span>
              <span className="">{toPersianDigits(phoneEnteredCount)} نفر</span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full"
                style={{
                  width: `${funnelWidth(phoneEnteredCount)}%`,
                }}
              />
            </div>
          </div>

          {/* Stage 3 */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
              <span>۳. پرداخت، آپلود فیش و ثبت نهایی:</span>
              <span className="">{toPersianDigits(orderSubmittedCount)} سفارش</span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full"
                style={{
                  width: `${funnelWidth(orderSubmittedCount)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Problem Solver Metrics (PRD Section 14: Baseline vs Now) */}
      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
        <h3 className="font-bold text-stone-900">نشانه‌های کار مرتب</h3>

        <div className="space-y-2">
          <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-stone-800 block">سفارش‌های بیش از یک روز بی‌پاسخ:</span>
              <span className="text-xs text-stone-500">سفارش ثبت‌شده‌ای که بیش از ۲۴ ساعت منتظر تأیید مانده</span>
            </div>
            <span className="shrink-0 font-semibold text-xs text-stone-800 bg-stone-100 px-2 py-1 rounded-md">
              {toPersianDigits(stalePercent)}٪
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-stone-800 block">مشتری وضعیت را خودش دید:</span>
              <span className="text-xs text-stone-500">هر بار یعنی یک پیام «سفارشم کجاست؟» کمتر</span>
            </div>
            <span className="shrink-0 font-semibold text-xs text-stone-800 bg-stone-100 px-2 py-1 rounded-md">
              {toPersianDigits(statusViewsCount)} بار
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-stone-800 block">سفارش از مشتری قبلی:</span>
              <span className="text-xs text-stone-500">سفارش‌هایی که از شمارهٔ یک خریدار قبلی آمده</span>
            </div>
            <span className="shrink-0 font-semibold text-xs text-stone-800 bg-stone-100 px-2 py-1 rounded-md">
              {toPersianDigits(returningOrdersCount)} سفارش
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
