import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, Download, Repeat2, RotateCcw, Store } from 'lucide-react';
import { Bezel, Button, Field, SectionTitle, Sheet, Stagger, Toggle } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { formatToman, toEnglishDigits, toPersianDigits } from '../utils/persianUtils';
import { ShareCard } from './ShareCard';
import { cardGroups } from '../lib/format';
import type { SellerData } from './SellerApp';

const digits = (v: string) => toEnglishDigits(v).replace(/\D/g, '');

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** What the link did this week, from events the app already records. */
function WeekNumbers({ sellerId }: { sellerId: string }) {
  const [counts, setCounts] = useState({ opened: 0, orders: 0, tracked: 0 });
  useEffect(() => {
    dataService.listEvents(sellerId).then((events) => {
      const since = Date.now() - WEEK;
      const recent = events.filter((e) => new Date(e.at).getTime() >= since);
      setCounts({
        opened: recent.filter((e) => e.type === 'form_opened').length,
        orders: recent.filter((e) => e.type === 'order_submitted').length,
        tracked: recent.filter((e) => e.type === 'status_page_viewed').length,
      });
    });
  }, [sellerId]);
  const tiles = [
    { label: 'بار لینک باز شد', value: counts.opened },
    { label: 'سفارش ثبت شد', value: counts.orders },
    { label: 'بار مشتری خودش پیگیری کرد', value: counts.tracked },
  ];
  return (
    <section className="space-y-3">
      <SectionTitle>هفتهٔ اخیر</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <Bezel key={t.label} innerClassName="p-3 text-center">
            <p className="text-2xl font-extrabold text-ink-900 tabular">{toPersianDigits(t.value)}</p>
            <p className="text-xs leading-5 text-ink-500 mt-1">{t.label}</p>
          </Bezel>
        ))}
      </div>
      <p className="px-1 text-xs text-ink-500">هر پیگیری یعنی یک پیام «سفارشم کجاست؟» که لازم نشد.</p>
    </section>
  );
}

const FREE_LIMIT = 30;
const MONTH = 30 * 24 * 60 * 60 * 1000;

/** Free plan up to 30 orders a month; paid plan adds automatic SMS so the seller never buys an SMS panel. */
function Plans({ recentOrders }: { recentOrders: number }) {
  const used = Math.min(recentOrders, FREE_LIMIT);
  return (
    <section className="space-y-3">
      <SectionTitle>پلن شما</SectionTitle>

      <Bezel innerClassName="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-ink-900">پایه</h3>
          <span className="text-xs font-semibold text-leaf-700 bg-leaf-50 rounded-full px-2.5 py-1">پلن فعلی</span>
        </div>
        <p className="text-sm text-ink-600">
          رایگان، تا {toPersianDigits(FREE_LIMIT)} سفارش در ماه. در ۳۰ روز اخیر {toPersianDigits(recentOrders)} سفارش داشتید.
        </p>
        <div className="h-2 rounded-full bg-ink-900/[0.07] overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full ${recentOrders >= FREE_LIMIT ? 'bg-parcel-500' : 'bg-leaf-500'}`}
            style={{ width: `${(used / FREE_LIMIT) * 100}%` }}
          />
        </div>
        <ul className="space-y-1.5 text-sm text-ink-700">
          {['لینک سفارش، صف سفارش‌ها، پیگیری و جست‌وجو', 'پیامک و پیام دایرکت آماده، از گوشی خودتان'].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-leaf-600 mt-1 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </Bezel>

      <div className="rounded-[1.75rem] p-[1.5px] bg-gradient-to-l from-brand-600 via-[#10a0e0] to-leaf-400 shadow-[var(--shadow-float)]">
        <div className="rounded-[calc(1.75rem-1.5px)] bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-extrabold text-ink-900">حرفه‌ای</h3>
            <div className="text-left">
              <p className="text-lg font-extrabold text-brand-700 tabular">۴۹۰ هزار تومان</p>
              <p className="text-xs text-ink-500">در ماه</p>
            </div>
          </div>
          <p className="text-xs text-ink-600">یا سالانه ۴ میلیون و ۹۰۰ هزار تومان، دو ماه رایگان</p>
          <ul className="space-y-1.5 text-sm text-ink-800">
            {[
              'سفارش نامحدود',
              'پیامک خودکار به مشتری در تأیید واریز و ارسال، بدون خرید پنل پیامکی (۲۰۰ پیامک در ماه)',
              'یادآور خرید دوباره با پیامک',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-600 mt-1 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button block disabled>
            ارتقا، به‌زودی
          </Button>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, onClick }: { label: string; value: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 text-right hover:bg-ink-900/[0.02]">
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-ink-500">{label}</span>
        <span className="block text-sm font-semibold text-ink-900 truncate">{value}</span>
      </span>
      {onClick && <ChevronLeft className="w-5 h-5 text-ink-300" />}
    </button>
  );
}

export function ShopScreen({
  data,
  onCreateShop,
  onSwitchShop,
  onOpenStorefront,
}: {
  data: SellerData;
  onCreateShop: () => void;
  onSwitchShop: () => void;
  onOpenStorefront: () => void;
}) {
  const { seller } = data;
  const toast = useToast();
  const isSample = dataService.isDemoSeller(seller.sellerId);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: '', card: '', holder: '', shipping: '', freeFrom: '' });

  useEffect(() => {
    setForm({
      name: seller.shop_name,
      card: seller.card_number,
      holder: seller.card_holder_name,
      shipping: String(seller.shipping_default_cost || ''),
      freeFrom: String(seller.free_shipping_min_items || ''),
    });
  }, [seller, edit]);

  const save = async () => {
    if (digits(form.card).length !== 16 || form.name.trim().length < 2) {
      toast('نام فروشگاه و شمارهٔ کارت ۱۶ رقمی را کامل کنید', 'error');
      return;
    }
    await dataService.saveSeller({
      ...seller,
      shop_name: form.name.trim(),
      card_number: digits(form.card),
      card_holder_name: form.holder.trim(),
      shipping_default_cost: Number(digits(form.shipping)) || 0,
      free_shipping_min_items: Number(digits(form.freeFrom)) || 0,
    });
    await data.reload();
    toast('ذخیره شد');
    setEdit(false);
  };

  return (
    <Stagger step={60} className="space-y-6">
      <h1 className="px-1 text-[1.6rem] font-extrabold text-ink-900">فروشگاه</h1>

      <ShareCard seller={seller} onOpen={onOpenStorefront} />

      <WeekNumbers sellerId={seller.sellerId} />

      <Plans recentOrders={data.orders.filter((o) => Date.now() - new Date(o.created_at).getTime() < MONTH).length} />

      <Bezel innerClassName="p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">سفارش می‌پذیرم</p>
          <p className="text-xs text-ink-500 mt-0.5">
            {seller.is_accepting_orders ? 'لینک سفارش باز است.' : 'لینک سفارش فعلاً بسته است.'}
          </p>
        </div>
        <Toggle
          checked={seller.is_accepting_orders}
          label="سفارش می‌پذیرم"
          onChange={async (v) => {
            await dataService.saveSeller({ ...seller, is_accepting_orders: v });
            await data.reload();
          }}
        />
      </Bezel>

      <section className="space-y-3">
        <SectionTitle>مشخصات</SectionTitle>
        <Bezel innerClassName="divide-y divide-ink-900/[0.06]">
          <Row label="نام فروشگاه" value={seller.shop_name} onClick={() => setEdit(true)} />
          <Row
            label="کارت واریز"
            value={
              <span dir="ltr" className="tabular">
                {cardGroups(seller.card_number)}
              </span>
            }
            onClick={() => setEdit(true)}
          />
          <Row
            label="ارسال"
            value={`${seller.shipping_default_cost ? formatToman(seller.shipping_default_cost) : 'رایگان'}${
              seller.free_shipping_min_items ? `، رایگان از ${toPersianDigits(seller.free_shipping_min_items)} عدد` : ''
            }`}
            onClick={() => setEdit(true)}
          />
        </Bezel>
      </section>

      <section className="space-y-2">
        <Button variant="secondary" block lead={<Download className="w-4 h-4" />} onClick={() => dataService.downloadOrdersCSV(seller.sellerId)}>
          خروجی اکسل سفارش‌ها
        </Button>
        {isSample && (
          <>
            <Button variant="secondary" block lead={<Store className="w-4 h-4" />} onClick={onCreateShop}>
              ساختن فروشگاه خودم
            </Button>
            <Button
              variant="quiet"
              block
              lead={<RotateCcw className="w-4 h-4" />}
              onClick={async () => {
                await dataService.resetSampleShop();
                await data.reload();
                toast('فروشگاه نمونه به حالت اول برگشت');
              }}
            >
              برگرداندن نمونه به حالت اول
            </Button>
          </>
        )}
        <Button variant="quiet" block lead={<Repeat2 className="w-4 h-4" />} onClick={onSwitchShop}>
          رفتن به فروشگاه دیگر
        </Button>
      </section>

      <Sheet
        open={edit}
        onClose={() => setEdit(false)}
        title="مشخصات فروشگاه"
        footer={
          <Button block size="lg" onClick={save}>
            ذخیره
          </Button>
        }
      >
        <div className="space-y-5">
          <Field label="نام فروشگاه" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field
            label="شماره کارت"
            ltr
            inputMode="numeric"
            value={digits(form.card).replace(/(\d{4})(?=\d)/g, '$1 ')}
            onChange={(e) => setForm({ ...form, card: digits(e.target.value).slice(0, 16) })}
          />
          <Field label="به نام" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="هزینهٔ ارسال" ltr inputMode="numeric" suffix="تومان" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: digits(e.target.value) })} />
            <Field label="ارسال رایگان از" ltr inputMode="numeric" suffix="عدد" value={form.freeFrom} onChange={(e) => setForm({ ...form, freeFrom: digits(e.target.value) })} />
          </div>
        </div>
      </Sheet>
    </Stagger>
  );
}
