import React, { useMemo } from 'react';
import { Copy, Repeat } from 'lucide-react';
import { Bezel, Button, SectionTitle, Stagger } from '../ui/kit';
import { useToast } from '../ui/toast';
import { toPersianDigits } from '../utils/persianUtils';
import { copyText, daysSince, shopLink, shortTitle } from '../lib/format';
import type { SellerData } from './SellerApp';

// show someone as due a few days early, so the message lands before they run out
const EARLY_DAYS = 5;

export function CustomersScreen({ data }: { data: SellerData }) {
  const { customers, products, seller } = data;
  const toast = useToast();

  const rows = useMemo(
    () =>
      customers
        .map((c) => {
          const cycle = products.find((p) => p.title === c.last_product_title)?.reorder_cycle_days;
          const since = daysSince(c.last_order_at);
          const left = cycle ? cycle - since : undefined;
          return { c, cycle, since, left, due: left !== undefined && left <= EARLY_DAYS };
        })
        .sort((a, b) => a.since - b.since),
    [customers, products]
  );

  const due = rows.filter((r) => r.due).sort((a, b) => (a.left ?? 0) - (b.left ?? 0));
  const returning = customers.filter((c) => c.orders_count > 1).length;

  const message = (name: string, product: string, since: number) =>
    `سلام ${name.split(' ')[0]}، ${seller.shop_name} هستیم. ${toPersianDigits(since)} روز پیش «${shortTitle(product)}» را از ما گرفتید. اگر تمام شده، با این لینک بدون نوشتن دوبارهٔ آدرس سفارش بدهید:\n${shopLink(seller.handle)}`;

  if (customers.length === 0) {
    return (
      <div className="space-y-2 px-1 pt-2 animate-rise">
        <h1 className="text-[1.6rem] font-extrabold text-ink-900">مشتری‌ها</h1>
        <p className="text-base leading-8 text-ink-600">
          هر کس از لینک شما سفارش بدهد، با شماره‌اش اینجا می‌آید. دفعهٔ بعد شناخته می‌شود و آدرسش آماده است.
        </p>
      </div>
    );
  }

  return (
    <Stagger step={60} className="space-y-6">
      <div className="space-y-4">
        <h1 className="px-1 text-[1.6rem] font-extrabold text-ink-900">مشتری‌ها</h1>
        <div className="grid grid-cols-2 gap-3">
          <Bezel innerClassName="p-4">
            <p className="text-2xl font-extrabold text-ink-900 tabular">{toPersianDigits(customers.length)}</p>
            <p className="text-xs text-ink-500 mt-1">مشتری</p>
          </Bezel>
          <Bezel innerClassName="p-4">
            <p className="text-2xl font-extrabold text-leaf-600 tabular">{toPersianDigits(returning)}</p>
            <p className="text-xs text-ink-500 mt-1">بیش از یک بار خریده‌اند</p>
          </Bezel>
        </div>
      </div>

      <section className="space-y-3">
        <SectionTitle>موعد خرید دوباره</SectionTitle>
        {due.length === 0 ? (
          <p className="px-1 text-sm leading-7 text-ink-500">
            فعلاً موعد کسی نرسیده. برای محصولات مصرفی در بخش محصولات بگویید مشتری هر چند روز یک‌بار دوباره می‌خرد.
          </p>
        ) : (
          due.map(({ c, since, left }) => (
            <Bezel key={c.customerId} innerClassName="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-parcel-50 text-parcel-700 flex items-center justify-center shrink-0">
                  <Repeat className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-ink-900">{c.full_name}</p>
                  <p className="text-sm text-ink-600 truncate">
                    {shortTitle(c.last_product_title)}، {toPersianDigits(since)} روز پیش
                  </p>
                  <p className="text-xs font-semibold text-parcel-700 mt-0.5">
                    {left !== undefined && left > 0 ? `${toPersianDigits(left)} روز تا تمام شدن` : 'احتمالاً تمام کرده'}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                block
                lead={<Copy className="w-4 h-4" />}
                onClick={async () => {
                  const ok = await copyText(message(c.full_name, c.last_product_title, since));
                  toast(ok ? 'پیام کپی شد. در دایرکت بفرستید' : 'کپی نشد', ok ? 'ok' : 'error');
                }}
              >
                کپی پیام یادآوری
              </Button>
            </Bezel>
          ))
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>همه</SectionTitle>
        <Bezel innerClassName="divide-y divide-ink-900/[0.06]">
          {rows.map(({ c, since }) => (
            <div key={c.customerId} className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 font-extrabold flex items-center justify-center shrink-0">
                {c.full_name.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-900 truncate">{c.full_name}</p>
                <p className="text-xs text-ink-500 truncate">
                  {shortTitle(c.last_product_title)}، {since === 0 ? 'امروز' : `${toPersianDigits(since)} روز پیش`}
                </p>
              </div>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${c.orders_count > 1 ? 'bg-leaf-50 text-leaf-700' : 'bg-ink-900/[0.05] text-ink-600'}`}>
                {toPersianDigits(c.orders_count)} خرید
              </span>
            </div>
          ))}
        </Bezel>
      </section>
    </Stagger>
  );
}
