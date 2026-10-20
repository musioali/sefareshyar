import React from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  HeartHandshake,
  LayoutList,
  Link2,
  ListChecks,
  PackageSearch,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Bezel, BrandMark, Button, Eyebrow, Stagger, Wordmark } from '../ui/kit';

const FEATURES = [
  { icon: Link2, title: 'یک لینک به‌جای ده‌ها پیام', body: 'مشتری محصول، آدرس و فیش را خودش کامل می‌کند.' },
  { icon: ListChecks, title: 'هیچ سفارشی جا نمی‌ماند', body: 'از تأیید فیش تا کد رهگیری، هر سفارش جای خودش را دارد.' },
  { icon: PackageSearch, title: 'پیگیری بدون پیام', body: 'مشتری وضعیت را خودش می‌بیند و بعد از تأیید واریز و ارسال، پیامک آماده دارید.' },
  { icon: HeartHandshake, title: 'مشتری قبلی یادتان می‌ماند', body: 'با شماره‌اش شناخته می‌شود و موعد خرید دوباره‌اش را می‌بینید.' },
];

const STEPS = [
  { title: 'معرفی فروشگاه', body: 'نام و آیدی اینستاگرام' },
  { title: 'کارت واریز', body: 'مشتری فیش را همان‌جا می‌فرستد' },
  { title: 'ارسال و اولین محصول', body: 'لینک سفارش آماده است' },
];

/** The first screen anyone sees: what it is, how to try it, how to start. */
export function Home({
  signedIn,
  onCreate,
  onSample,
  onStorefront,
  onPanel,
}: {
  /** this browser already has a shop open */
  signedIn?: boolean;
  onCreate: () => void;
  onSample: () => void;
  onStorefront: () => void;
  onPanel: () => void;
}) {
  return (
    <div className="min-h-dvh">
      <header className="max-w-5xl mx-auto px-5 md:px-8 pt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BrandMark size={40} />
          <Wordmark className="text-2xl" />
        </div>
        <Button size="sm" variant="secondary" onClick={onPanel}>
          {signedIn ? 'رفتن به پنل' : 'ورود فروشنده'}
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-5 md:px-8 pb-16">
        {/* Hero */}
        <section className="pt-10 md:pt-16 grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-12 items-center">
          <Stagger step={90} className="text-center md:text-right">
            <Eyebrow>برای فروشنده‌های خانگی اینستاگرام</Eyebrow>
            <h1 className="mt-5 text-[2rem] md:text-[2.75rem] leading-[1.45] font-black text-ink-900 [text-wrap:balance]">
              سفارش‌های دایرکت، مرتب و بی‌دردسر
            </h1>
            <p className="mt-4 text-base md:text-lg leading-8 md:leading-9 text-ink-600 max-w-[34ch] mx-auto md:mx-0 [text-wrap:pretty]">
              یک لینک در بیو بگذارید. مشتری سفارشش را خودش ثبت می‌کند و شما همه را یک‌جا می‌بینید.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button size="lg" onClick={onCreate} icon={<ArrowLeft className="w-5 h-5" />}>
                ساختن فروشگاه رایگان
              </Button>
              <Button size="lg" variant="secondary" onClick={onSample}>
                دیدن فروشگاه نمونه
              </Button>
            </div>
            <p className="mt-4 text-sm text-ink-500">بدون نصب برنامه، روی گوشی و کامپیوتر</p>
          </Stagger>

          <Glimpse />
        </section>

        {/* Try it */}
        <section className="mt-20 md:mt-28" aria-labelledby="try">
          <h2 id="try" className="text-xl md:text-2xl font-extrabold text-ink-900 text-center">
            در یک دقیقه امتحانش کنید
          </h2>
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <TryCard
              icon={LayoutList}
              tag="نگاه فروشنده"
              title="پنل فروشگاه نمونه"
              body="صف سفارش‌ها از فیش تا ارسال، مشتری‌های قبلی و سود هر محصول."
              action="باز کردن پنل"
              onClick={onSample}
            />
            <TryCard
              icon={ShoppingBag}
              tag="نگاه مشتری"
              title="لینک سفارش نمونه"
              body="مثل یک مشتری شمع بخرید و فیش بفرستید. سفارش در پنل نمونه می‌نشیند."
              action="باز کردن لینک سفارش"
              external
              onClick={onStorefront}
            />
          </div>
          <p className="mt-4 text-sm text-ink-500 text-center">سفارشی که از لینک ثبت کنید، در همین مرورگر به پنل می‌رسد.</p>
        </section>

        {/* Features */}
        <section className="mt-20 md:mt-28" aria-labelledby="features">
          <h2 id="features" className="text-xl md:text-2xl font-extrabold text-ink-900 text-center">
            چه چیزی عوض می‌شود
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-7 max-w-3xl mx-auto">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-white ring-1 ring-ink-900/[0.06] shadow-[var(--shadow-float)] text-brand-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="pt-0.5">
                  <h3 className="text-base font-extrabold text-ink-900">{title}</h3>
                  <p className="mt-0.5 text-sm leading-7 text-ink-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section className="mt-20 md:mt-28" aria-labelledby="setup">
          <h2 id="setup" className="text-xl md:text-2xl font-extrabold text-ink-900 text-center">
            راه‌اندازی در سه قدم
          </h2>
          <ol className="mt-8 grid md:grid-cols-3 gap-3 md:gap-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Bezel innerClassName="p-5 flex md:flex-col items-center md:items-start gap-4 md:gap-5 h-full">
                  <span className="w-11 h-11 shrink-0 rounded-full bg-brand-600 text-white text-lg font-extrabold flex items-center justify-center tabular">
                    {(i + 1).toLocaleString('fa-IR')}
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-ink-900">{s.title}</h3>
                    <p className="mt-0.5 text-sm text-ink-600">{s.body}</p>
                  </div>
                </Bezel>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex justify-center">
            <Button size="lg" onClick={onCreate} icon={<ArrowLeft className="w-5 h-5" />}>
              شروع راه‌اندازی
            </Button>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-20 md:mt-28" aria-labelledby="pricing">
          <h2 id="pricing" className="text-xl md:text-2xl font-extrabold text-ink-900 text-center">
            قیمت
          </h2>
          <div className="mt-8 grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <Bezel innerClassName="p-6 h-full">
              <h3 className="text-base font-extrabold text-ink-900">پایه</h3>
              <p className="mt-2 text-2xl font-black text-ink-900">رایگان</p>
              <p className="text-sm text-ink-500">تا ۳۰ سفارش در ماه</p>
              <PlanList tone="leaf" items={['لینک سفارش، صف و پیگیری', 'پیامک و پیام دایرکت آماده، از گوشی خودتان']} />
            </Bezel>
            <div className="rounded-[1.75rem] p-[1.5px] bg-gradient-to-l from-brand-600 via-[#10a0e0] to-leaf-400 shadow-[var(--shadow-float)]">
              <div className="rounded-[calc(1.75rem-1.5px)] bg-white p-6 h-full">
                <h3 className="text-base font-extrabold text-ink-900">حرفه‌ای</h3>
                <p className="mt-2 text-2xl font-black text-brand-700 tabular">۴۹۰ هزار تومان</p>
                <p className="text-sm text-ink-500">در ماه، یا سالانه ۴ میلیون و ۹۰۰ هزار تومان</p>
                <PlanList
                  tone="brand"
                  items={['سفارش نامحدود', 'پیامک خودکار در تأیید واریز و ارسال، بدون خرید پنل پیامکی', 'یادآور خرید دوباره با پیامک']}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-900/[0.06]">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <Wordmark className="text-lg" />
          </div>
          <button onClick={onCreate} className="text-sm font-bold text-brand-700 hover:text-brand-800 min-h-11 px-1">
            ساختن فروشگاه
          </button>
        </div>
      </footer>
    </div>
  );
}

function TryCard({
  icon: Icon,
  tag,
  title,
  body,
  action,
  external,
  onClick,
}: {
  icon: React.ElementType;
  tag: string;
  title: string;
  body: string;
  action: string;
  external?: boolean;
  onClick: () => void;
}) {
  return (
    <Bezel innerClassName="p-6 h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold text-ink-500">{tag}</span>
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm leading-7 text-ink-600 flex-1">{body}</p>
      <div className="mt-5">
        <Button
          variant={external ? 'secondary' : 'primary'}
          onClick={onClick}
          icon={external ? <ExternalLink className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        >
          {action}
        </Button>
      </div>
    </Bezel>
  );
}

function PlanList({ items, tone }: { items: string[]; tone: 'leaf' | 'brand' }) {
  return (
    <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2">
          <Check className={`w-4 h-4 mt-1 shrink-0 ${tone === 'leaf' ? 'text-leaf-600' : 'text-brand-600'}`} />
          {f}
        </li>
      ))}
    </ul>
  );
}

/** A still picture of the order queue, so the idea lands before any reading. */
function Glimpse() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm h-[19rem] animate-rise" style={{ animationDelay: '260ms' }}>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_45%_45%,rgba(38,117,232,0.22),rgba(31,176,125,0.14)_55%,transparent_72%)] blur-2xl" />
      <BrandMark size={120} className="absolute -top-2 left-1/2 -translate-x-1/2 animate-bob drop-shadow-[0_18px_30px_rgba(21,98,214,0.25)]" />

      <div className="absolute inset-x-8 top-28 -rotate-3 rounded-[1.6rem] bg-white/75 ring-1 ring-ink-900/[0.06] p-4 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink-700">زهرا کاظمی</span>
          <span className="flex items-center gap-1 text-leaf-600 font-semibold">
            <Truck className="w-3.5 h-3.5" /> ارسال شد
          </span>
        </div>
        <div className="mt-3 h-2 w-1/2 rounded-full bg-ink-100" />
      </div>

      <div className="absolute inset-x-0 top-40 rotate-[1.5deg] rounded-[1.75rem] bg-ink-900/[0.035] ring-1 ring-ink-900/[0.05] p-1.5 shadow-[var(--shadow-lift)]">
        <div className="rounded-[calc(1.75rem-0.375rem)] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Eyebrow tone="parcel">سفارش تازه</Eyebrow>
            <span className="text-xs text-ink-500">۲ دقیقه پیش</span>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-ink-900">مریم احمدی</div>
            <div className="text-sm text-ink-500">۲ شمع کوچک (وانیل)، ارسال به تهران</div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-ink-100">
            <span className="flex items-center gap-1 text-xs font-bold text-leaf-600">
              <Check className="w-4 h-4" /> فیش رسید
            </span>
            <span className="text-base font-extrabold text-ink-900 tabular">۶۱۵٬۰۰۰ تومان</span>
          </div>
        </div>
      </div>
    </div>
  );
}
