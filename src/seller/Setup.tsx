import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button, Field, IconButton, cx } from '../ui/kit';
import { dataService } from '../services/dataService';
import { Product, Seller } from '../types';
import { generateRandomToken, toEnglishDigits, toPersianDigits } from '../utils/persianUtils';

const digits = (v: string) => toEnglishDigits(v).replace(/\D/g, '');
const num = (v: string) => Number(digits(v) || 0);

const STEPS = [
  { title: 'فروشگاهتان را معرفی کنید', body: 'مشتری این نام را بالای صفحهٔ سفارش می‌بیند.' },
  { title: 'پول به کجا واریز شود؟', body: 'بعد از انتخاب محصول، مشتری این کارت را می‌بیند و فیش را همان‌جا می‌فرستد.' },
  { title: 'ارسال و اولین محصول', body: 'بقیهٔ محصولات را بعداً از بخش محصولات اضافه می‌کنید.' },
];

export function Setup({ onCancel, onDone }: { onCancel: () => void; onDone: (sellerId: string) => void }) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [shopName, setShopName] = useState('');
  const [handle, setHandle] = useState('');
  const [card, setCard] = useState('');
  const [holder, setHolder] = useState('');
  const [shipping, setShipping] = useState('');
  const [freeFrom, setFreeFrom] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [reorderDays, setReorderDays] = useState('');

  const host = window.location.host;

  const validate = async (): Promise<boolean> => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (shopName.trim().length < 2) e.shopName = 'نام فروشگاه را بنویسید.';
      const h = handle.trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9._]{3,30}$/.test(h)) e.handle = 'فقط حروف انگلیسی کوچک، عدد، نقطه و زیرخط؛ دست‌کم ۳ حرف.';
      else if (!(await dataService.checkHandleAvailable(h))) e.handle = 'این آیدی قبلاً روی این گوشی ثبت شده است.';
    }
    if (step === 1) {
      if (digits(card).length !== 16) e.card = 'شماره کارت ۱۶ رقم است.';
      if (holder.trim().length < 3) e.holder = 'نام صاحب کارت را همان‌طور که بانک نشان می‌دهد بنویسید.';
    }
    if (step === 2) {
      if (productTitle.trim().length < 2) e.productTitle = 'نام محصول را بنویسید.';
      if (num(productPrice) < 1000) e.productPrice = 'قیمت را به تومان وارد کنید.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!(await validate())) return;
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    const sellerId = 'seller_' + generateRandomToken(10);
    const seller: Seller = {
      sellerId,
      shop_name: shopName.trim(),
      handle: handle.trim().replace(/^@/, '').toLowerCase(),
      card_number: digits(card),
      card_holder_name: holder.trim(),
      business_type: 'fixed',
      shipping_default_cost: num(shipping),
      free_shipping_min_items: num(freeFrom),
      deposit_percent_default: 100,
      is_accepting_orders: true,
      created_at: new Date().toISOString(),
    };
    const product: Product = {
      id: 'prod_' + generateRandomToken(8),
      title: productTitle.trim(),
      available: true,
      min_lead_days: 2,
      pricing_mode: 'fixed',
      base_price: num(productPrice),
      fields: [],
      template: null,
      reorder_cycle_days: num(reorderDays) || undefined,
    };
    await dataService.saveSeller(seller);
    await dataService.saveProduct(sellerId, product);
    onDone(sellerId);
  };

  const back = () => (step === 0 ? onCancel() : setStep(step - 1));
  const cardPretty = (v: string) =>
    digits(v)
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ');

  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col">
      <header className="px-5 pt-4 space-y-5">
        <div className="flex items-center justify-between">
          <IconButton label={step === 0 ? 'بستن' : 'قدم قبل'} onClick={back} className="-mr-2">
            {step === 0 ? <X className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </IconButton>
          <span className="text-sm text-ink-500 tabular">
            قدم {toPersianDigits(step + 1)} از ۳
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5 rounded-full bg-ink-900/[0.07] overflow-hidden">
              <div
                className={cx(
                  'h-full rounded-full bg-brand-600 origin-right transition-transform duration-700 ease-[var(--ease-spring)]',
                  i <= step ? 'scale-x-100' : 'scale-x-0'
                )}
              />
            </div>
          ))}
        </div>
      </header>

      <main key={step} className="flex-1 px-5 pt-8 pb-8 space-y-7 animate-rise">
        <div className="space-y-2">
          <h1 className="text-[1.6rem] leading-[1.5] font-extrabold text-ink-900">{STEPS[step].title}</h1>
          <p className="text-base leading-8 text-ink-600">{STEPS[step].body}</p>
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <Field
              label="نام فروشگاه"
              placeholder="مثلاً صابون بابونه"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              error={errors.shopName}
              autoFocus
            />
            <Field
              label="آیدی پیج اینستاگرام"
              placeholder="baboneh_soap"
              ltr
              suffix="@"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s/g, ''))}
              error={errors.handle}
              hint={
                <>
                  لینک سفارش شما:{' '}
                  <span dir="ltr" className="text-ink-700">
                    {host}/#/s/{handle.replace(/^@/, '') || 'your_page'}
                  </span>
                </>
              }
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field
              label="شماره کارت"
              placeholder="۰۰۰۰ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰"
              inputMode="numeric"
              ltr
              value={cardPretty(card)}
              onChange={(e) => setCard(e.target.value)}
              error={errors.card}
              autoFocus
            />
            <Field
              label="به نام"
              placeholder="نام صاحب کارت"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              error={errors.holder}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="هزینهٔ ارسال"
                placeholder="۹۵۰۰۰"
                inputMode="numeric"
                ltr
                suffix="تومان"
                value={shipping}
                onChange={(e) => setShipping(digits(e.target.value))}
              />
              <Field
                label="ارسال رایگان از"
                placeholder="۳"
                inputMode="numeric"
                ltr
                suffix="عدد"
                value={freeFrom}
                onChange={(e) => setFreeFrom(digits(e.target.value))}
              />
            </div>
            <div className="h-px bg-ink-900/[0.07]" />
            <Field
              label="اولین محصول"
              placeholder="مثلاً صابون جو دوسر"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              error={errors.productTitle}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="قیمت"
                placeholder="۱۲۰۰۰۰"
                inputMode="numeric"
                ltr
                suffix="تومان"
                value={productPrice}
                onChange={(e) => setProductPrice(digits(e.target.value))}
                error={errors.productPrice}
              />
              <Field
                label="دوباره می‌خرند هر"
                placeholder="۳۰"
                inputMode="numeric"
                ltr
                suffix="روز"
                value={reorderDays}
                onChange={(e) => setReorderDays(digits(e.target.value))}
                hint="اختیاری"
              />
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper/95 to-paper/0">
        <Button size="lg" block disabled={busy} onClick={next} icon={<ArrowLeft className="w-5 h-5" />}>
          {step < 2 ? 'ادامه' : 'ساختن فروشگاه'}
        </Button>
      </footer>
    </div>
  );
}
