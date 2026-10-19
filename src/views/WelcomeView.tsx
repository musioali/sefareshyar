import React from 'react';
import { Check, Link2, ListChecks, Package, Truck, UserRound } from 'lucide-react';

interface WelcomeViewProps {
  onCreateShop: () => void;
  onOpenSample: () => void;
  onLogin: () => void;
}

const BENEFITS = [
  {
    icon: Link2,
    title: 'یک لینک برای همهٔ سفارش‌ها',
    body: 'مشتری محصول، آدرس و فیش را خودش وارد می‌کند. دیگر لازم نیست از لای پیام‌ها جمعشان کنید.',
  },
  {
    icon: ListChecks,
    title: 'هیچ سفارشی جا نمی‌ماند',
    body: 'از تأیید فیش تا ساخت و ارسال، هر سفارش جای مشخصی دارد و می‌دانید کدام منتظر شماست.',
  },
  {
    icon: UserRound,
    title: 'مشتری قبلی را می‌شناسید',
    body: 'خریدار تکراری با شماره‌اش شناخته می‌شود و موعد خرید دوباره‌اش یادتان می‌ماند.',
  },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onCreateShop, onOpenSample, onLogin }) => {
  return (
    <div className="min-h-dvh bg-paper max-w-lg mx-auto flex flex-col">
      <header className="px-6 pt-8 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <span className="text-base font-bold text-stone-900">سفارش‌یار</span>
      </header>

      <main className="flex-1 px-6 pt-8 pb-6 space-y-10">
        <section className="space-y-4">
          <h1 className="text-[1.75rem] leading-[1.45] font-extrabold text-stone-900 [text-wrap:balance]">
            سفارش‌های دایرکت، مرتب و بی‌دردسر
          </h1>
          <p className="text-base leading-8 text-stone-600 max-w-[34ch]">
            به‌جای جمع کردن آدرس و فیش از لای پیام‌ها، یک لینک بفرستید. مشتری سفارشش را خودش کامل می‌کند و شما همه را یک‌جا می‌بینید.
          </p>
        </section>

        {/* A glimpse of the seller's queue: two stacked order cards */}
        <section aria-hidden="true" className="relative h-52 select-none">
          <div className="absolute inset-x-6 top-0 rotate-[-2.5deg] rounded-3xl bg-white/70 border border-stone-200 p-4 shadow-[0_12px_32px_-18px_rgba(87,41,26,0.35)]">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-semibold text-stone-700">زهرا کاظمی</span>
              <span className="flex items-center gap-1 text-emerald-700">
                <Truck className="w-3.5 h-3.5" />
                ارسال شد
              </span>
            </div>
            <div className="mt-2 h-2 w-2/3 rounded-full bg-stone-100" />
          </div>
          <div className="absolute inset-x-0 top-10 rounded-3xl bg-white border border-stone-200 p-5 space-y-3 shadow-[0_18px_40px_-20px_rgba(87,41,26,0.45)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md">سفارش تازه</span>
              <span className="text-xs text-stone-500">۲ دقیقه پیش</span>
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">مریم احمدی</div>
              <div className="text-xs text-stone-500 mt-0.5">۲ شمع کوچک دارچین، ارسال به تهران</div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                <Check className="w-3.5 h-3.5" />
                فیش رسید
              </span>
              <span className="text-sm font-bold text-stone-900">۶۱۵٬۰۰۰ تومان</span>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3.5">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-stone-900">{title}</h2>
                <p className="text-sm leading-7 text-stone-600">{body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="sticky bottom-0 px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper to-paper/0 space-y-2">
        <button
          type="button"
          onClick={onCreateShop}
          className="w-full h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold"
        >
          ساختن فروشگاه
        </button>
        <button
          type="button"
          onClick={onOpenSample}
          className="w-full h-12 rounded-2xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-900 text-sm font-semibold"
        >
          اول یک فروشگاه نمونه ببینم
        </button>
        <button
          type="button"
          onClick={onLogin}
          className="w-full min-h-11 text-sm font-semibold text-stone-600 hover:text-stone-900"
        >
          قبلاً فروشگاه ساخته‌ام
        </button>
      </footer>
    </div>
  );
};
