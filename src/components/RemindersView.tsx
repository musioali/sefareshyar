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
import { Customer, Seller } from '../types';
import { toPersianDigits } from '../utils/persianUtils';

interface RemindersViewProps {
  seller: Seller | null;
  customers: Customer[];
  onBack: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  seller,
  customers,
  onBack,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          <span>۵۰٪ فروش پیج‌های اینستاگرامی از مشتریان قبلی است!</span>
        </div>
        <p className="text-[11px] leading-relaxed text-stone-700">
          ۸۳٪ فروشندگان خانگی دیتابیس مشتری ندارند و آنها را گم می‌کنند. این بخش مشتریانی که زمان شارژ مجدد محصولشان فرا رسیده یا سالگرد سفارش قبلی‌شان نزدیک است را برای شما لیست می‌کند.
        </p>
      </div>

      {/* Customers List for Re-order Reminders */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-800">مشتریان نیازمند پیگیری و بازخرید:</h3>

        {customers.length === 0 ? (
          <div className="p-6 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
            هنوز مشتری با سابقه خریدی در سیستم ثبت نشده است.
          </div>
        ) : (
          customers.map((c) => {
            const firstName = c.full_name.trim().split(' ')[0] || c.full_name;
            const productTitle = c.last_product_title || 'محصولات دست‌ساز';
            const reminderText = `سلام ${firstName} عزیز 🌸 ${seller?.shop_name} هستیم. امیدواریم از «${productTitle}» کاملاً راضی بوده باشید. زمان سفارش و شارژ مجدد رسیده است! برای ثبت سفارش یک‌کلیکی بدون تایپ مجدد آدرس می‌توانید از لینک زیر استفاده کنید:\n${shopUrl}`;
            const isCopied = copiedId === c.customerId;

            return (
              <div
                key={c.customerId}
                className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-stone-900">{c.full_name}</span>
                      <span className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded">
                        {toPersianDigits(c.orders_count)} خرید قبلی
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      آخرین خرید: <b>{productTitle}</b> • شماره: {toPersianDigits(c.phone)}
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                    فرصت یادآور بازخرید
                  </div>
                </div>

                {/* Pre-written Message Preview */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 text-[11px] leading-relaxed select-all">
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
