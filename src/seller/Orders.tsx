import React, { useMemo, useState } from 'react';
import { CircleCheck, Hammer, PackageCheck, Repeat } from 'lucide-react';
import { Bezel, Dot, Segmented, Stagger, cx } from '../ui/kit';
import { Order } from '../types';
import { formatToman, toPersianDigits } from '../utils/persianUtils';
import { getDaysRemaining } from '../utils/dateUtils';
import { STAGES, Stage, itemsSummary, stageOf, timeAgo } from '../lib/format';
import { ShareCard } from './ShareCard';
import { OrderSheet } from './OrderSheet';
import type { SellerData } from './SellerApp';

export function statusLine(o: Order): { text: string; tone: 'parcel' | 'brand' | 'leaf' | 'ink' } {
  switch (o.status) {
    case 'submitted':
      return { text: 'منتظر تأیید واریز', tone: 'parcel' };
    case 'needs_info':
      return { text: 'منتظر جواب مشتری', tone: 'ink' };
    case 'confirmed':
      return { text: 'آمادهٔ شروع ساخت', tone: 'brand' };
    case 'in_production': {
      const d = getDaysRemaining(o.delivery_due_date);
      if (d === null) return { text: 'در حال ساخت', tone: 'brand' };
      if (d < 0) return { text: `در حال ساخت، ${toPersianDigits(-d)} روز از موعد گذشته`, tone: 'parcel' };
      if (d === 0) return { text: 'در حال ساخت، موعد تحویل امروز', tone: 'parcel' };
      return { text: `در حال ساخت، ${toPersianDigits(d)} روز تا موعد`, tone: 'brand' };
    }
    case 'packed':
      return { text: 'بسته‌بندی شد، منتظر ارسال', tone: 'brand' };
    case 'shipped':
      return { text: o.tracking_code ? 'ارسال شد، کد رهگیری ثبت شده' : 'ارسال شد', tone: 'leaf' };
    case 'cancelled':
      return { text: 'لغو شد', tone: 'ink' };
    default:
      return { text: '', tone: 'ink' };
  }
}

function OrderCard({ order, returning, onOpen }: { order: Order; returning: boolean; onOpen: () => void }) {
  const line = statusLine(order);
  return (
    <Bezel as="button" onClick={onOpen} innerClassName="p-4" aria-label={`سفارش ${order.customer_name}`}>
      <div className="flex items-start gap-3">
        <span className="relative shrink-0" aria-hidden="true">
          <span
            className={cx(
              'w-11 h-11 rounded-2xl flex items-center justify-center text-base font-extrabold',
              returning ? 'bg-leaf-50 text-leaf-700' : 'bg-brand-50 text-brand-700'
            )}
          >
            {order.customer_name.charAt(0)}
          </span>
          {returning && (
            <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-leaf-500 text-white ring-2 ring-white flex items-center justify-center">
              <Repeat className="w-3 h-3" />
            </span>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-bold text-ink-900 truncate">{order.customer_name}</span>
            <span className="text-xs text-ink-400 shrink-0">{timeAgo(order.created_at)}</span>
          </div>
          <p className="text-sm text-ink-600 truncate mt-0.5">
            {returning && <span className="text-leaf-700 font-semibold">مشتری قبلی، </span>}
            {itemsSummary(order)}
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-ink-900/[0.06] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
              <Dot tone={line.tone} />
              {line.text}
            </span>
            <span className="text-sm font-extrabold text-ink-900 tabular shrink-0">{formatToman(order.total_amount)}</span>
          </div>
        </div>
      </div>
    </Bezel>
  );
}

export function OrdersScreen({ data, onOpenStorefront }: { data: SellerData; onOpenStorefront: () => void }) {
  const { seller, orders, customers } = data;
  const [stage, setStage] = useState<Stage>('new');
  const [openId, setOpenId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const m: Record<Stage, Order[]> = { new: [], making: [], ready: [], sent: [] };
    orders.forEach((o) => {
      const s = stageOf(o.status);
      if (s) m[s].push(o);
    });
    return m;
  }, [orders]);

  const returningPhones = useMemo(
    () => new Set(customers.filter((c) => c.orders_count > 1).map((c) => c.phone)),
    [customers]
  );

  const open = orders.find((o) => o.orderId === openId) || null;
  const waiting = orders.filter((o) => o.status === 'submitted').length;

  if (orders.length === 0) {
    return (
      <Stagger className="space-y-5">
        <div className="space-y-1.5 px-1">
          <h1 className="text-[1.6rem] font-extrabold text-ink-900">فروشگاهتان آماده است</h1>
          <p className="text-base leading-8 text-ink-600">اولین سفارش که برسد، همین‌جا می‌بینیدش.</p>
        </div>
        <ShareCard seller={seller} onOpen={onOpenStorefront} />
      </Stagger>
    );
  }

  const list = byStage[stage];

  return (
    <div className="space-y-5">
      {/* today at a glance */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setStage('new')}
          className={cx(
            'col-span-2 w-full text-right rounded-[1.75rem] p-5 flex items-center justify-between gap-4 shadow-[var(--shadow-float)] animate-rise',
            waiting > 0
              ? 'bg-gradient-to-l from-parcel-500 to-parcel-400 text-white'
              : 'bg-gradient-to-l from-leaf-500 to-leaf-400 text-white'
          )}
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white/85">{waiting > 0 ? 'منتظر تأیید شما' : 'همهٔ فیش‌ها بررسی شده'}</p>
            <p className="text-[1.65rem] font-extrabold leading-tight">
              {waiting > 0 ? `${toPersianDigits(waiting)} سفارش تازه` : 'کار عقب‌افتاده ندارید'}
            </p>
          </div>
          <span className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CircleCheck className="w-7 h-7" />
          </span>
        </button>
        <Bezel as="button" onClick={() => setStage('making')} className="animate-rise [animation-delay:70ms]" innerClassName="p-4 space-y-2">
          <Hammer className="w-5 h-5 text-brand-600" />
          <p className="text-2xl font-extrabold text-ink-900 tabular">{toPersianDigits(byStage.making.length)}</p>
          <p className="text-xs text-ink-500">در حال ساخت</p>
        </Bezel>
        <Bezel as="button" onClick={() => setStage('ready')} className="animate-rise [animation-delay:140ms]" innerClassName="p-4 space-y-2">
          <PackageCheck className="w-5 h-5 text-brand-600" />
          <p className="text-2xl font-extrabold text-ink-900 tabular">{toPersianDigits(byStage.ready.length)}</p>
          <p className="text-xs text-ink-500">آمادهٔ ارسال</p>
        </Bezel>
      </div>

      <Segmented
        value={stage}
        onChange={setStage}
        items={STAGES.map((s) => ({ id: s.id, label: s.label, count: byStage[s.id].length }))}
      />

      {list.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-ink-900/15 px-6 py-10 text-center animate-fade">
          <p className="text-base font-bold text-ink-800">اینجا سفارشی نیست</p>
          <p className="mt-1 text-sm text-ink-500">
            {stage === 'new' ? 'سفارش تازه که برسد، اینجا می‌آید.' : 'سفارش‌ها با تأیید شما به این مرحله می‌آیند.'}
          </p>
        </div>
      ) : (
        <Stagger key={stage} step={55} className="space-y-3">
          {list.map((o) => (
            <OrderCard key={o.orderId} order={o} returning={returningPhones.has(o.phone)} onOpen={() => setOpenId(o.orderId)} />
          ))}
        </Stagger>
      )}

      <OrderSheet
        order={open}
        seller={seller}
        customers={customers}
        onClose={() => setOpenId(null)}
        onChanged={data.reload}
      />
    </div>
  );
}
