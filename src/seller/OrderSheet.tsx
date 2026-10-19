import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert, Copy, MessageCircle, X, ZoomIn } from 'lucide-react';
import { Button, Field, IconButton, Sheet, TextArea, cx } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { CarrierType, Customer, Order, OrderStatus, Seller } from '../types';
import { formatToman, toPersianDigits, toEnglishDigits } from '../utils/persianUtils';
import { formatToJalaliText } from '../utils/dateUtils';
import { copyText, shortTitle, timeAgo, trackLink } from '../lib/format';
import { statusLine } from './Orders';

const CARRIERS: { id: CarrierType; label: string }[] = [
  { id: 'post', label: 'پست' },
  { id: 'tipax', label: 'تیپاکس' },
  { id: 'courier', label: 'پیک' },
];

const PATH: Record<string, OrderStatus[]> = {
  submitted: ['confirmed', 'in_production'],
  needs_info: ['submitted', 'confirmed', 'in_production'],
  confirmed: ['in_production'],
  in_production: ['packed'],
};

export function OrderSheet({
  order,
  seller,
  customers,
  onClose,
  onChanged,
}: {
  order: Order | null;
  seller: Seller;
  customers: Customer[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [bankSeen, setBankSeen] = useState(false);
  const [mode, setMode] = useState<'main' | 'ask' | 'cancel'>('main');
  const [askText, setAskText] = useState('');
  const [carrier, setCarrier] = useState<CarrierType>('post');
  const [tracking, setTracking] = useState('');
  const [trackErr, setTrackErr] = useState('');
  const [viewReceipt, setViewReceipt] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBankSeen(false);
    setMode('main');
    setAskText('');
    setTracking('');
    setTrackErr('');
    setCarrier('post');
  }, [order?.orderId]);

  if (!order) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const customer = customers.find((c) => c.phone === order.phone);
  const returning = (customer?.orders_count || 0) > 1;
  const firstName = order.customer_name.split(' ')[0];
  const receipt = order.files?.find((f) => f.kind === 'receipt' && f.data_b64);
  const shortfall = order.deposit_required - order.deposit_paid_claimed;
  const line = statusLine(order);

  const run = async (steps: OrderStatus[], note?: string, code?: string, car?: CarrierType) => {
    setBusy(true);
    try {
      for (const st of steps) {
        await dataService.updateOrderStatus(order.orderId, st, note, code, car);
      }
      await onChanged();
      return true;
    } catch (e: any) {
      toast(e.message || 'انجام نشد', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, msg: string) => {
    const ok = await copyText(text);
    toast(ok ? msg : 'کپی نشد', ok ? 'ok' : 'error');
  };

  const shippedMessage = () =>
    `سلام ${firstName}، سفارش ${order.short_code} از ${seller.shop_name} ارسال شد.` +
    (order.tracking_code ? `\nکد رهگیری: ${order.tracking_code}` : '') +
    `\nپیگیری سفارش: ${trackLink(order.orderId)}`;

  const address = [order.ship_to.name, order.ship_to.city, order.ship_to.address, order.ship_to.postal_code && `کد پستی ${toPersianDigits(order.ship_to.postal_code)}`]
    .filter(Boolean)
    .join('، ');

  /* ---------- footer per stage ---------- */
  let footer: React.ReactNode = null;
  if (mode === 'ask') {
    footer = (
      <div className="space-y-3">
        <Button
          block
          disabled={busy || askText.trim().length < 3}
          onClick={async () => {
            const msg = `سلام ${firstName}، سفارش ${order.short_code} در ${seller.shop_name} رسید. ${askText.trim()}`;
            if (order.status === 'submitted' && !(await run(['needs_info'], askText.trim()))) return;
            await copy(msg, 'پیام کپی شد. در دایرکت بفرستید');
            onClose();
          }}
        >
          کپی پیام و منتظر جواب ماندن
        </Button>
        <Button variant="quiet" block onClick={() => setMode('main')}>
          برگشت
        </Button>
      </div>
    );
  } else if (mode === 'cancel') {
    footer = (
      <div className="space-y-3">
        <p className="text-sm text-ink-700 text-center">این سفارش لغو شود؟ برگرداندن پول با خود شماست.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setMode('main')}>
            نه
          </Button>
          <Button
            className="!bg-rose-600 hover:!bg-rose-700 !shadow-none"
            disabled={busy}
            onClick={async () => {
              if (await run(['cancelled'], 'لغو توسط فروشنده')) {
                toast('سفارش لغو شد');
                onClose();
              }
            }}
          >
            لغو شود
          </Button>
        </div>
      </div>
    );
  } else if (order.status === 'submitted' || order.status === 'needs_info') {
    footer = (
      <div className="space-y-3">
        <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={bankSeen}
            onChange={(e) => setBankSeen(e.target.checked)}
            className="w-5 h-5 accent-brand-600 shrink-0"
          />
          <span className="text-sm text-ink-800">این مبلغ را در حساب بانکی‌ام دیدم</span>
        </label>
        <Button
          block
          size="lg"
          disabled={!bankSeen || busy}
          icon={<Check className="w-5 h-5" />}
          onClick={async () => {
            if (await run(PATH[order.status], 'تأیید واریز')) {
              toast('واریز تأیید شد. سفارش رفت به در حال ساخت');
              onClose();
            }
          }}
        >
          تأیید واریز و شروع ساخت
        </Button>
        <div className="flex items-center justify-between">
          <Button variant="quiet" size="sm" lead={<MessageCircle className="w-4 h-4" />} onClick={() => setMode('ask')}>
            سؤال از مشتری
          </Button>
          <Button variant="danger" size="sm" onClick={() => setMode('cancel')}>
            لغو سفارش
          </Button>
        </div>
      </div>
    );
  } else if (order.status === 'confirmed' || order.status === 'in_production') {
    const label = order.status === 'confirmed' ? 'شروع ساخت' : 'بسته‌بندی شد';
    footer = (
      <Button
        block
        size="lg"
        disabled={busy}
        icon={<Check className="w-5 h-5" />}
        onClick={async () => {
          if (await run(PATH[order.status])) {
            toast(order.status === 'confirmed' ? 'ساخت شروع شد' : 'رفت به آمادهٔ ارسال');
            onClose();
          }
        }}
      >
        {label}
      </Button>
    );
  } else if (order.status === 'packed') {
    footer = (
      <Button
        block
        size="lg"
        disabled={busy}
        icon={<Check className="w-5 h-5" />}
        onClick={async () => {
          const code = toEnglishDigits(tracking).replace(/\D/g, '');
          if (carrier !== 'courier' && code.length < 10) {
            setTrackErr('کد رهگیری را کامل وارد کنید.');
            return;
          }
          if (await run(['shipped'], 'ارسال شد', code || undefined, carrier)) {
            toast('ارسال ثبت شد. حالا پیام را برای مشتری بفرستید');
          }
        }}
      >
        ثبت ارسال
      </Button>
    );
  } else if (order.status === 'shipped') {
    footer = (
      <Button block size="lg" icon={<Copy className="w-5 h-5" />} onClick={() => copy(shippedMessage(), 'پیام ارسال کپی شد')}>
        کپی پیام ارسال برای مشتری
      </Button>
    );
  }

  return (
    <>
      <Sheet
        open={Boolean(order)}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{order.customer_name}</span>
            {returning && (
              <span className="text-xs font-semibold text-leaf-700 bg-leaf-50 rounded-full px-2 py-0.5 shrink-0">
                {toPersianDigits(customer!.orders_count)} خرید
              </span>
            )}
          </div>
        }
        footer={footer}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
            <span className="flex items-center gap-1.5 font-semibold text-ink-700">
              <span
                className={cx(
                  'w-2 h-2 rounded-full',
                  { parcel: 'bg-parcel-500', brand: 'bg-brand-500', leaf: 'bg-leaf-500', ink: 'bg-ink-400' }[line.tone]
                )}
              />
              {line.text}
            </span>
            <span>
              کد <bdi className="font-bold text-ink-800 tabular">{order.short_code}</bdi>، {timeAgo(order.created_at)}
            </span>
          </div>

          {mode === 'ask' && (
            <TextArea
              label="چه چیزی را از مشتری بپرسید؟"
              placeholder="مثلاً مبلغ فیش با جمع سفارش نمی‌خواند، لطفاً فیش کامل را بفرستید."
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              autoFocus
            />
          )}

          {/* items */}
          <section className="rounded-3xl bg-white ring-1 ring-ink-900/[0.06] p-4 space-y-2.5">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-800">
                  <b className="tabular">{toPersianDigits(it.qty)}</b> {shortTitle(it.title)}
                </span>
                <span className="text-ink-700 tabular shrink-0">{formatToman(it.qty * it.unit_price)}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 text-sm text-ink-500">
              <span>ارسال</span>
              <span className="tabular">{order.shipping_cost ? formatToman(order.shipping_cost) : 'رایگان'}</span>
            </div>
            <div className="h-px bg-ink-900/[0.07]" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold text-ink-900">جمع</span>
              <span className="text-lg font-extrabold text-ink-900 tabular">{formatToman(order.total_amount)}</span>
            </div>
          </section>

          {/* payment */}
          {receipt && (
            <section className="flex items-center gap-4">
              <button
                onClick={() => setViewReceipt(true)}
                className="relative w-20 h-24 shrink-0 rounded-2xl overflow-hidden ring-1 ring-ink-900/10 bg-white shadow-[var(--shadow-float)]"
                aria-label="دیدن فیش"
              >
                <img src={receipt.data_b64} alt="فیش واریز" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 w-7 h-7 rounded-full bg-ink-900/70 text-white flex items-center justify-center">
                  <ZoomIn className="w-4 h-4" />
                </span>
              </button>
              <div className="space-y-1.5">
                <p className="text-sm text-ink-600">طبق فیش واریز شده</p>
                <p className="text-xl font-extrabold text-ink-900 tabular">{formatToman(order.deposit_paid_claimed)}</p>
                {shortfall > 0 ? (
                  <p className="flex items-center gap-1 text-xs font-semibold text-rose-700">
                    <CircleAlert className="w-4 h-4" /> {formatToman(shortfall)} کمتر از جمع سفارش
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-xs font-semibold text-leaf-700">
                    <Check className="w-4 h-4" /> با جمع سفارش می‌خواند
                    {order.paid_at_claimed && <span className="text-ink-500 font-normal">، ساعت {toPersianDigits(order.paid_at_claimed)}</span>}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* address */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">ارسال به</h3>
              <button onClick={() => copy(address, 'آدرس کپی شد')} className="min-h-10 px-2 text-sm font-semibold text-brand-700 flex items-center gap-1">
                <Copy className="w-4 h-4" /> کپی
              </button>
            </div>
            <p className="text-sm leading-7 text-ink-700">{address}</p>
            <p className="text-sm text-ink-500">
              تلفن <span dir="ltr" className="tabular text-ink-700">{toPersianDigits(order.ship_to.phone || order.phone)}</span>
              {order.ship_to.is_gift && <span className="mr-2 text-parcel-700 font-semibold">هدیه است، بدون فاکتور</span>}
            </p>
          </section>

          {order.status === 'needs_info' && order.seller_note && (
            <section className="rounded-2xl bg-ink-900/[0.04] p-4 text-sm leading-7 text-ink-700">
              پرسیده‌اید: {order.seller_note}
            </section>
          )}

          {/* shipping entry */}
          {order.status === 'packed' && mode === 'main' && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-ink-900">با چه چیزی می‌فرستید؟</h3>
              <div className="flex gap-2">
                {CARRIERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCarrier(c.id)}
                    className={cx(
                      'h-11 flex-1 rounded-full text-sm font-semibold',
                      carrier === c.id ? 'bg-ink-900 text-white' : 'bg-white ring-1 ring-ink-900/10 text-ink-700'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {carrier !== 'courier' && (
                <Field
                  label="کد رهگیری"
                  inputMode="numeric"
                  ltr
                  placeholder="۲۶۴۸۱۴۷۳۱۱۲۵..."
                  value={tracking}
                  onChange={(e) => {
                    setTracking(e.target.value);
                    setTrackErr('');
                  }}
                  error={trackErr}
                />
              )}
            </section>
          )}

          {order.status === 'shipped' && (
            <section className="rounded-3xl bg-leaf-50 ring-1 ring-leaf-600/10 p-4 space-y-2">
              <p className="text-sm font-bold text-leaf-700">
                ارسال شد{order.carrier ? ` با ${CARRIERS.find((c) => c.id === order.carrier)?.label || 'پیک'}` : ''}
              </p>
              {order.tracking_code && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-ink-900 tabular" dir="ltr">
                    {order.tracking_code}
                  </span>
                  <button onClick={() => copy(order.tracking_code!, 'کد رهگیری کپی شد')} className="min-h-10 px-2 text-sm font-semibold text-leaf-700">
                    کپی کد
                  </button>
                </div>
              )}
              <p className="text-xs text-ink-600">مشتری با لینک پیگیری وضعیت را خودش می‌بیند.</p>
            </section>
          )}

          {order.delivery_due_date && order.status !== 'shipped' && order.status !== 'cancelled' && (
            <p className="text-xs text-ink-500">موعد تحویلی که به مشتری گفته شده: {formatToJalaliText(order.delivery_due_date)}</p>
          )}
        </div>
      </Sheet>

      {viewReceipt &&
        receipt &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-ink-950/90 flex items-center justify-center p-6 animate-fade" onClick={() => setViewReceipt(false)}>
            <img src={receipt.data_b64} alt="فیش واریز" className="max-h-full max-w-full rounded-2xl shadow-[var(--shadow-lift)]" />
            <IconButton label="بستن" onClick={() => setViewReceipt(false)} className="absolute top-4 left-4 bg-white/15 text-white hover:bg-white/25">
              <X className="w-5 h-5" />
            </IconButton>
          </div>,
          document.body
        )}
    </>
  );
}
