import React from 'react';
import { ArrowLeft, Link2, ListChecks, HeartHandshake, Check, Truck } from 'lucide-react';
import { BrandMark, Button, Eyebrow, Wordmark, Stagger } from '../ui/kit';

const BENEFITS = [
  {
    icon: Link2,
    title: 'یک لینک به‌جای ده‌ها پیام',
    body: 'مشتری محصول، آدرس و فیش را خودش در لینک کامل می‌کند.',
  },
  {
    icon: ListChecks,
    title: 'هیچ سفارشی جا نمی‌ماند',
    body: 'از تأیید فیش تا ارسال، هر سفارش جای خودش را دارد.',
  },
  {
    icon: HeartHandshake,
    title: 'مشتری قبلی یادتان می‌ماند',
    body: 'خریدار تکراری با شماره‌اش شناخته می‌شود و موعد خرید دوباره‌اش را می‌بینید.',
  },
];

export function Welcome({
  onCreate,
  onSample,
  onSignIn,
}: {
  onCreate: () => void;
  onSample: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col">
      <main className="flex-1 px-6 pt-10 pb-8">
        <Stagger step={90} className="space-y-10">
          {/* Hero */}
          <section className="flex flex-col items-center text-center">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(38,117,232,0.28),rgba(31,176,125,0.18)_55%,transparent_72%)] blur-2xl"
              />
              <BrandMark size={168} className="relative animate-bob drop-shadow-[0_18px_30px_rgba(21,98,214,0.25)]" />
            </div>
            <Wordmark className="mt-2 text-[2.6rem]" />
            <div className="mt-5">
              <Eyebrow>برای فروشنده‌های خانگی اینستاگرام</Eyebrow>
            </div>
            <h1 className="mt-4 text-[1.7rem] leading-[1.5] font-extrabold text-ink-900 [text-wrap:balance]">
              سفارش‌های دایرکت، مرتب و بی‌دردسر
            </h1>
            <p className="mt-3 text-base leading-8 text-ink-600 max-w-[30ch] [text-wrap:pretty]">
              یک لینک بفرستید. مشتری سفارشش را خودش کامل می‌کند و شما همه را یک‌جا می‌بینید.
            </p>
          </section>

          {/* A glimpse of the queue */}
          <section aria-hidden="true" className="relative h-[13.5rem] mx-2">
            <div className="absolute inset-x-8 top-0 -rotate-3 rounded-[1.6rem] bg-white/70 ring-1 ring-ink-900/[0.06] p-4 shadow-[var(--shadow-float)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink-700">زهرا کاظمی</span>
                <span className="flex items-center gap-1 text-leaf-600 font-semibold">
                  <Truck className="w-3.5 h-3.5" /> ارسال شد
                </span>
              </div>
              <div className="mt-3 h-2 w-1/2 rounded-full bg-ink-100" />
            </div>
            <div className="absolute inset-x-0 top-11 rotate-[1.5deg] rounded-[1.75rem] bg-ink-900/[0.035] ring-1 ring-ink-900/[0.05] p-1.5 shadow-[var(--shadow-lift)]">
              <div className="rounded-[calc(1.75rem-0.375rem)] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Eyebrow tone="parcel">سفارش تازه</Eyebrow>
                  <span className="text-xs text-ink-500">۲ دقیقه پیش</span>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-ink-900">مریم احمدی</div>
                  <div className="text-sm text-ink-500">۲ شمع کوچک، ارسال به تهران</div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-ink-100">
                  <span className="flex items-center gap-1 text-xs font-bold text-leaf-600">
                    <Check className="w-4 h-4" /> فیش رسید
                  </span>
                  <span className="text-base font-extrabold text-ink-900 tabular">۶۱۵٬۰۰۰ تومان</span>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="space-y-5 pt-2">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-white ring-1 ring-ink-900/[0.06] shadow-[var(--shadow-float)] text-brand-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-base font-extrabold text-ink-900">{title}</h2>
                  <p className="mt-0.5 text-sm leading-7 text-ink-600">{body}</p>
                </div>
              </div>
            ))}
          </section>
        </Stagger>
      </main>

      <footer className="sticky bottom-0 z-10 px-6 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper/95 to-paper/0">
        <div className="space-y-2.5">
          <Button size="lg" block onClick={onCreate} icon={<ArrowLeft className="w-5 h-5" />}>
            ساختن فروشگاه
          </Button>
          <Button size="lg" variant="secondary" block onClick={onSample}>
            دیدن یک فروشگاه نمونه
          </Button>
          <Button size="md" variant="quiet" block onClick={onSignIn}>
            قبلاً فروشگاه ساخته‌ام
          </Button>
        </div>
      </footer>
    </div>
  );
}
