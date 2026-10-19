import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Gift, ImagePlus, MapPin, Store } from 'lucide-react';
import { BrandMark, Bezel, Button, Field, IconButton, QtyStepper, Toggle, cx } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { CustomerHint, OrderFile, OrderItem, PublicShop } from '../types';
import {
  formatToman,
  isValidIranPhone,
  normalizePhone,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/persianUtils';
import { processAndCompressImage } from '../utils/imageUtils';
import { cardGroups, copyText, maskAddress, shortTitle, trackLink } from '../lib/format';
import { nowClock, sampleReceiptDataUrl } from '../lib/receipt';

type Step = 'shop' | 'details' | 'pay' | 'done';
const SAVED_ADDRESS = 'آدرس ذخیره‌شده مشتری';

export function Storefront({ handle, onTrack }: { handle: string; onTrack: (orderId: string) => void }) {
  const toast = useToast();
  const [shop, setShop] = useState<PublicShop | null | undefined>(undefined);
  const [step, setStep] = useState<Step>('shop');
  const [cart, setCart] = useState<Record<string, number>>({});

  // details
  const [phone, setPhone] = useState('');
  const [hint, setHint] = useState<CustomerHint | null>(null);
  const [useSaved, setUseSaved] = useState(true);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postal, setPostal] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // pay
  const [receipt, setReceipt] = useState<OrderFile | null>(null);
  const [paid, setPaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderId: string; code: string } | null>(null);

  useEffect(() => {
    (async () => {
      dataService.syncFromStorage();
      const s = await dataService.getSellerByHandle(handle);
      setShop(s);
      if (s) dataService.logEvent(s.seller_id, 'form_opened', { handle });
    })();
  }, [handle]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const lines = useMemo(() => {
    if (!shop) return [];
    return shop.products.filter((p) => (cart[p.id] || 0) > 0).map((p) => ({ p, qty: cart[p.id] }));
  }, [shop, cart]);

  const qty = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.qty * l.p.base_price, 0);
  const freeFrom = shop?.free_shipping_min_items || 0;
  const shipping = !shop || qty === 0 || (freeFrom > 0 && qty >= freeFrom) ? 0 : shop.shipping_default_cost || 0;
  const total = subtotal + shipping;

  /* ---------- states before the shop loads ---------- */
  if (shop === undefined) return <div className="min-h-dvh" />;
  if (shop === null) {
    return (
      <CenterNote
        title="این فروشگاه پیدا نشد"
        body="لینک را دوباره از فروشنده بگیرید. ممکن است آیدی پیج عوض شده باشد."
      />
    );
  }
  if (!shop.is_accepting_orders && step !== 'done') {
    return (
      <CenterNote
        title={`${shop.shop_name} فعلاً سفارش نمی‌گیرد`}
        body="ظرفیت این روزها پر شده است. برای زمان باز شدن دوباره به دایرکت پیج پیام بدهید."
      />
    );
  }

  const isSample = dataService.isDemoSeller(shop.seller_id);

  /* ---------- actions ---------- */
  const checkPhone = async (value: string) => {
    setPhone(value);
    const n = normalizePhone(value);
    if (isValidIranPhone(n)) {
      const h = await dataService.getCustomerHint(shop.seller_id, n);
      setHint(h);
      setUseSaved(Boolean(h?.has_address));
      if (h && !name) setName(h.first_name);
      dataService.logEvent(shop.seller_id, 'phone_entered', { returning: Boolean(h) });
    } else {
      setHint(null);
    }
  };

  const toPay = () => {
    const e: Record<string, string> = {};
    if (!isValidIranPhone(normalizePhone(phone))) e.phone = 'شمارهٔ موبایل ۱۱ رقمی را وارد کنید.';
    if (name.trim().length < 2) e.name = 'نام گیرنده را بنویسید.';
    if (!(useSaved && hint?.has_address)) {
      if (city.trim().length < 2) e.city = 'شهر را بنویسید.';
      if (address.trim().length < 8) e.address = 'نشانی را کامل بنویسید: خیابان، کوچه، پلاک، واحد.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setPaid(String(total));
    setStep('pay');
  };

  const onReceipt = async (file: File) => {
    try {
      const r = await processAndCompressImage(file, 1400, 0.75);
      setReceipt({ kind: 'receipt', data_b64: r.dataUrl, width: r.width, height: r.height, bytes: r.compressedBytes });
    } catch (err: any) {
      toast(err?.message || 'عکس خوانده نشد', 'error');
    }
  };

  const submit = async () => {
    if (!receipt) {
      toast('عکس فیش واریز را بگذارید', 'error');
      return;
    }
    setBusy(true);
    const claimed = Number(toEnglishDigits(paid).replace(/\D/g, '')) || 0;
    const lead = Math.max(1, ...lines.map((l) => l.p.min_lead_days || 1));
    const items: OrderItem[] = lines.map((l) => ({ product_id: l.p.id, title: l.p.title, qty: l.qty, unit_price: l.p.base_price }));
    const n = normalizePhone(phone);
    const saved = useSaved && hint?.has_address;
    const { order } = await dataService.createOrder({
      seller_id: shop.seller_id,
      customer_name: name.trim(),
      phone: n,
      items,
      subtotal,
      shipping_cost: shipping,
      discount: 0,
      total_amount: total,
      deposit_required: total,
      deposit_paid_claimed: claimed,
      paid_at_claimed: toPersianDigits(nowClock()),
      ship_to: saved
        ? { name: '', phone: n, city: '', address: SAVED_ADDRESS, postal_code: '', is_gift: isGift }
        : { name: name.trim(), phone: n, city: city.trim(), address: address.trim(), postal_code: toEnglishDigits(postal).trim(), is_gift: isGift },
      delivery_due_date: new Date(Date.now() + lead * 86400000).toISOString(),
      flags: { price_mismatch: claimed < total },
      status: 'submitted',
      files: [receipt],
    });
    setBusy(false);
    setDone({ orderId: order.orderId, code: order.short_code });
    setStep('done');
  };

  const lastProduct = hint ? shop.products.find((p) => p.available && p.title === hint.last_product_title) : undefined;

  /* ---------- layout ---------- */
  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col">
      {/* shop identity */}
      <header className="px-5 pt-5 pb-2 flex items-center gap-3">
        {step !== 'shop' && step !== 'done' ? (
          <IconButton label="برگشت" onClick={() => setStep(step === 'pay' ? 'details' : 'shop')} className="-mr-2">
            <ArrowRight className="w-5 h-5" />
          </IconButton>
        ) : null}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 via-[#10a0e0] to-leaf-400 text-white text-xl font-extrabold flex items-center justify-center shrink-0 shadow-[var(--shadow-brand)]">
          {shop.shop_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-ink-900 truncate">{shop.shop_name}</h1>
          <p className="text-xs text-ink-500" dir="ltr" style={{ textAlign: 'right' }}>
            @{shop.handle}
          </p>
        </div>
      </header>

      {step !== 'done' && (
        <div className="px-5 pt-3">
          <div className="grid grid-cols-3 gap-2" aria-hidden="true">
            {(['shop', 'details', 'pay'] as Step[]).map((s, i) => (
              <div key={s} className="h-1.5 rounded-full bg-ink-900/[0.07] overflow-hidden">
                <div
                  className={cx(
                    'h-full bg-brand-600 rounded-full origin-right transition-transform duration-700 ease-[var(--ease-spring)]',
                    ['shop', 'details', 'pay'].indexOf(step) >= i ? 'scale-x-100' : 'scale-x-0'
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <main key={step} className="flex-1 px-5 pt-6 pb-40 animate-rise">
        {step === 'shop' && (
          <div className="space-y-5">
            <div className="space-y-1.5 px-1">
              <h2 className="text-[1.6rem] font-extrabold text-ink-900">چه می‌خواهید؟</h2>
              {freeFrom > 0 && (
                <p className="text-sm text-ink-600">
                  {qty >= freeFrom
                    ? 'ارسال این سفارش رایگان است.'
                    : `از ${toPersianDigits(freeFrom)} عدد به بالا ارسال رایگان است${qty > 0 ? `؛ ${toPersianDigits(freeFrom - qty)} عدد دیگر.` : '.'}`}
                </p>
              )}
            </div>
            <div className="space-y-3">
              {shop.products.map((p) => {
                const spec = p.title.match(/\((.*?)\)/)?.[1];
                return (
                  <Bezel key={p.id} innerClassName={cx('p-4 flex items-center gap-4', !p.available && 'opacity-60')}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-base font-bold text-ink-900">{shortTitle(p.title)}</p>
                      {spec && <p className="text-xs text-ink-500">{spec}</p>}
                      <p className="text-base font-extrabold text-ink-900 tabular pt-1">{formatToman(p.base_price)}</p>
                      <p className="text-xs text-ink-500">
                        {p.available ? `آماده در ${toPersianDigits(p.min_lead_days || 1)} روز` : 'فعلاً ناموجود'}
                      </p>
                    </div>
                    <QtyStepper
                      value={cart[p.id] || 0}
                      disabled={!p.available}
                      onChange={(v) => setCart((c) => ({ ...c, [p.id]: Math.max(0, v) }))}
                    />
                  </Bezel>
                );
              })}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6">
            <h2 className="px-1 text-[1.6rem] font-extrabold text-ink-900">به کجا بفرستیم؟</h2>
            <Field
              label="شمارهٔ موبایل"
              type="tel"
              inputMode="numeric"
              ltr
              maxLength={11}
              placeholder="09xxxxxxxxx"
              value={phone}
              onChange={(e) => checkPhone(e.target.value)}
              error={errors.phone}
              hint="با همین شماره سفارش را پیگیری می‌کنید و دفعهٔ بعد آدرستان آماده است."
            />

            {hint && (
              <div className="rounded-3xl bg-leaf-50 ring-1 ring-leaf-600/10 p-4 space-y-3 animate-rise">
                <p className="text-base font-extrabold text-leaf-700">خوش برگشتید {hint.first_name}</p>
                {lastProduct && !cart[lastProduct.id] && (
                  <button
                    onClick={() => setCart((c) => ({ ...c, [lastProduct.id]: 1 }))}
                    className="w-full text-right rounded-2xl bg-white ring-1 ring-leaf-600/15 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-ink-700">
                      دفعهٔ قبل «{shortTitle(lastProduct.title)}» گرفتید
                    </span>
                    <span className="text-sm font-bold text-leaf-700 shrink-0">افزودن</span>
                  </button>
                )}
              </div>
            )}

            {hint?.has_address && (
              <div className="space-y-2">
                {[true, false].map((saved) => (
                  <button
                    key={String(saved)}
                    onClick={() => setUseSaved(saved)}
                    className={cx(
                      'w-full text-right rounded-2xl px-4 py-3.5 flex items-center gap-3 ring-1',
                      useSaved === saved ? 'bg-white ring-2 ring-brand-500' : 'bg-white/60 ring-ink-900/10'
                    )}
                  >
                    <span
                      className={cx(
                        'w-5 h-5 rounded-full ring-2 flex items-center justify-center shrink-0',
                        useSaved === saved ? 'ring-brand-600' : 'ring-ink-300'
                      )}
                    >
                      {useSaved === saved && <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-ink-900">{saved ? 'همان آدرس قبلی' : 'آدرس تازه'}</span>
                      {saved && (
                        <span className="block text-xs text-ink-500 truncate">
                          {maskAddress(hint.saved_address?.city, hint.saved_address?.address)}
                        </span>
                      )}
                    </span>
                    {saved && <MapPin className="w-5 h-5 text-ink-400" />}
                  </button>
                ))}
              </div>
            )}

            <Field label="نام گیرنده" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />

            {!(useSaved && hint?.has_address) && (
              <div className="space-y-5 animate-rise">
                <Field label="شهر" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} placeholder="تهران" />
                <Field
                  label="نشانی"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  error={errors.address}
                  placeholder="خیابان، کوچه، پلاک، واحد"
                />
                <Field label="کد پستی" ltr inputMode="numeric" value={postal} onChange={(e) => setPostal(e.target.value)} hint="اختیاری، ولی بسته را زودتر می‌رساند." />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white ring-1 ring-ink-900/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-ink-800">
                <Gift className="w-5 h-5 text-parcel-500" /> هدیه است، فاکتور داخل بسته نباشد
              </span>
              <Toggle checked={isGift} onChange={setIsGift} label="هدیه" />
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div className="space-y-6">
            <h2 className="px-1 text-[1.6rem] font-extrabold text-ink-900">پرداخت</h2>

            <Bezel innerClassName="p-4 space-y-2.5">
              {lines.map((l) => (
                <div key={l.p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-800">
                    <b className="tabular">{toPersianDigits(l.qty)}</b> {shortTitle(l.p.title)}
                  </span>
                  <span className="text-ink-700 tabular shrink-0">{formatToman(l.qty * l.p.base_price)}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between text-sm text-ink-500">
                <span>ارسال</span>
                <span className="tabular">{shipping ? formatToman(shipping) : 'رایگان'}</span>
              </div>
              <div className="h-px bg-ink-900/[0.07]" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-ink-900">مبلغ قابل پرداخت</span>
                <span className="text-xl font-extrabold text-ink-900 tabular">{formatToman(total)}</span>
              </div>
            </Bezel>

            <div className="rounded-[1.75rem] bg-gradient-to-br from-brand-600 via-brand-500 to-[#10a0e0] p-5 text-white space-y-4 shadow-[var(--shadow-brand)]">
              <p className="text-sm text-white/85">این مبلغ را به این کارت واریز کنید</p>
              <p className="text-[1.4rem] font-extrabold tabular whitespace-nowrap" dir="ltr" style={{ textAlign: 'right' }}>
                {cardGroups(shop.card_number)}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">به نام {shop.card_holder_name}</span>
                <button
                  onClick={async () => {
                    const ok = await copyText(shop.card_number);
                    toast(ok ? 'شماره کارت کپی شد' : 'کپی نشد', ok ? 'ok' : 'error');
                  }}
                  className="h-10 px-4 rounded-full bg-white/20 hover:bg-white/30 text-sm font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" /> کپی
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink-800 px-1">عکس فیش واریز</p>
              {receipt ? (
                <div className="flex items-center gap-4 rounded-3xl bg-white ring-1 ring-ink-900/10 p-3">
                  <img src={receipt.data_b64} alt="فیش واریز" className="w-16 h-20 rounded-xl object-cover ring-1 ring-ink-900/10" />
                  <div className="flex-1">
                    <p className="flex items-center gap-1 text-sm font-bold text-leaf-700">
                      <Check className="w-4 h-4" /> فیش اضافه شد
                    </p>
                    <label className="text-sm font-semibold text-brand-700 cursor-pointer">
                      عوض کردن
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onReceipt(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink-900/15 bg-white/60 hover:bg-white px-4 py-8 cursor-pointer">
                  <span className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <ImagePlus className="w-6 h-6" />
                  </span>
                  <span className="text-sm font-bold text-ink-900">انتخاب عکس فیش</span>
                  <span className="text-xs text-ink-500">اسکرین‌شات اپ بانک هم کافی است</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onReceipt(e.target.files[0])} />
                </label>
              )}
              {!receipt && isSample && (
                <Button
                  variant="ghost"
                  block
                  onClick={() =>
                    setReceipt({ kind: 'receipt', data_b64: sampleReceiptDataUrl(total, shop.card_holder_name, nowClock()), width: 600, height: 840 })
                  }
                >
                  این فروشگاه نمونه است؛ فیش نمونه بگذار
                </Button>
              )}
            </div>

            <Field
              label="مبلغی که واریز کردید"
              ltr
              inputMode="numeric"
              suffix="تومان"
              value={paid}
              onChange={(e) => setPaid(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
            />
          </div>
        )}

        {step === 'done' && done && (
          <div className="pt-6 text-center space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-leaf-500 text-white flex items-center justify-center shadow-[0_18px_40px_-14px_rgba(31,176,125,0.7)] animate-pop">
              <Check className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[1.7rem] font-extrabold text-ink-900">سفارشتان رسید</h2>
              <p className="text-base leading-8 text-ink-600 max-w-[30ch] mx-auto">
                {shop.shop_name} فیش را بررسی می‌کند. وضعیت سفارش را هر وقت خواستید از لینک پیگیری ببینید.
              </p>
            </div>
            <Bezel innerClassName="py-5 text-center">
              <p className="text-xs text-ink-500">کد سفارش</p>
              <p className="text-3xl font-extrabold text-brand-700 tabular mt-1" dir="ltr">
                {done.code}
              </p>
            </Bezel>
            <div className="space-y-2.5">
              <Button size="lg" block icon={<ArrowLeft className="w-5 h-5" />} onClick={() => onTrack(done.orderId)}>
                دیدن وضعیت سفارش
              </Button>
              <Button
                variant="secondary"
                size="lg"
                block
                lead={<Copy className="w-4 h-4" />}
                onClick={async () => {
                  const ok = await copyText(trackLink(done.orderId));
                  toast(ok ? 'لینک پیگیری کپی شد' : 'کپی نشد', ok ? 'ok' : 'error');
                }}
              >
                کپی لینک پیگیری
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* floating action island */}
      {step !== 'done' && (step !== 'shop' || qty > 0) && (
        <div className="fixed z-30 inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] px-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md rounded-full bg-white/90 backdrop-blur-xl ring-1 ring-ink-900/10 shadow-[var(--shadow-lift)] p-1.5 flex items-center gap-3 animate-rise">
            <div className="pr-4 min-w-0">
              <p className="text-xs text-ink-500">{toPersianDigits(qty)} قلم</p>
              <p className="text-base font-extrabold text-ink-900 tabular truncate">{formatToman(total)}</p>
            </div>
            <Button
              className="flex-1"
              disabled={busy || (step === 'shop' && qty === 0) || (step === 'pay' && !receipt)}
              icon={<ArrowLeft className="w-5 h-5" />}
              onClick={() => (step === 'shop' ? setStep('details') : step === 'details' ? toPay() : submit())}
            >
              {step === 'pay' ? 'ثبت سفارش' : 'ادامه'}
            </Button>
          </div>
        </div>
      )}

      {step === 'shop' && qty === 0 && (
        <footer className="pb-8 flex items-center justify-center gap-1.5 text-xs text-ink-400">
          <BrandMark size={20} /> سفارش با سفارش‌یار
        </footer>
      )}
    </div>
  );
}

function CenterNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto px-6 flex flex-col items-center justify-center text-center gap-4 animate-rise">
      <span className="w-16 h-16 rounded-3xl bg-white ring-1 ring-ink-900/[0.06] shadow-[var(--shadow-float)] text-ink-500 flex items-center justify-center">
        <Store className="w-7 h-7" />
      </span>
      <h1 className="text-xl font-extrabold text-ink-900">{title}</h1>
      <p className="text-base leading-8 text-ink-600 max-w-[32ch]">{body}</p>
    </div>
  );
}
