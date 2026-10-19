import React, { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Bezel, Button, Field, Sheet, Stagger, Toggle } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { Product } from '../types';
import { formatToman, generateRandomToken, toEnglishDigits, toPersianDigits } from '../utils/persianUtils';
import { shortTitle } from '../lib/format';
import type { SellerData } from './SellerApp';

const digits = (v: string) => toEnglishDigits(v).replace(/\D/g, '');

function ProductSheet({
  product,
  open,
  sellerId,
  onClose,
  onSaved,
}: {
  product: Product | null;
  open: boolean;
  sellerId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [lead, setLead] = useState('');
  const [cycle, setCycle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitle(product?.title || '');
    setPrice(product ? String(product.base_price) : '');
    setLead(product ? String(product.min_lead_days) : '2');
    setCycle(product?.reorder_cycle_days ? String(product.reorder_cycle_days) : '');
    setErrors({});
  }, [product, open]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 2) e.title = 'نام محصول را بنویسید.';
    if (Number(digits(price)) < 1000) e.price = 'قیمت را به تومان وارد کنید.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const next: Product = {
      ...(product || {
        id: 'prod_' + generateRandomToken(8),
        available: true,
        pricing_mode: 'fixed',
        fields: [],
        template: null,
      }),
      title: title.trim(),
      base_price: Number(digits(price)),
      min_lead_days: Number(digits(lead)) || 0,
      reorder_cycle_days: Number(digits(cycle)) || undefined,
    } as Product;
    await dataService.saveProduct(sellerId, next);
    await onSaved();
    toast(product ? 'محصول ذخیره شد' : 'محصول اضافه شد');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? 'ویرایش محصول' : 'محصول تازه'}
      footer={
        <Button block size="lg" onClick={save}>
          ذخیره
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="نام محصول" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="قیمت" ltr inputMode="numeric" suffix="تومان" value={price} onChange={(e) => setPrice(digits(e.target.value))} error={errors.price} />
          <Field label="آماده‌سازی" ltr inputMode="numeric" suffix="روز" value={lead} onChange={(e) => setLead(digits(e.target.value))} />
        </div>
        <Field
          label="مشتری هر چند روز یک‌بار دوباره می‌خرد؟"
          ltr
          inputMode="numeric"
          suffix="روز"
          placeholder="۳۰"
          value={cycle}
          onChange={(e) => setCycle(digits(e.target.value))}
          hint="برای محصول مصرفی. با این عدد، موعد خرید دوبارهٔ مشتری‌ها را می‌بینید."
        />
        {product && (
          <Button
            variant="danger"
            block
            onClick={async () => {
              await dataService.deleteProduct(sellerId, product.id);
              await onSaved();
              toast('محصول حذف شد');
              onClose();
            }}
          >
            حذف این محصول
          </Button>
        )}
      </div>
    </Sheet>
  );
}

export function ProductsScreen({ data }: { data: SellerData }) {
  const { products, seller } = data;
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const toggle = async (p: Product, v: boolean) => {
    await dataService.saveProduct(seller.sellerId, { ...p, available: v });
    await data.reload();
  };

  return (
    <Stagger step={60} className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[1.6rem] font-extrabold text-ink-900">محصولات</h1>
        <Button
          size="sm"
          lead={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          محصول تازه
        </Button>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <Bezel key={p.id} innerClassName="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold truncate ${p.available ? 'text-ink-900' : 'text-ink-400'}`}>{shortTitle(p.title)}</p>
              <p className="text-sm text-ink-600 tabular">{formatToman(p.base_price)}</p>
              <p className="text-xs text-ink-500 mt-0.5">
                {p.reorder_cycle_days ? `دوباره می‌خرند هر ${toPersianDigits(p.reorder_cycle_days)} روز` : 'موعد خرید دوباره ندارد'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Toggle checked={p.available} onChange={(v) => toggle(p, v)} label={p.available ? 'موجود' : 'ناموجود'} />
              <span className="text-xs text-ink-500">{p.available ? 'موجود' : 'ناموجود'}</span>
            </div>
            <button
              onClick={() => {
                setEditing(p);
                setOpen(true);
              }}
              aria-label="ویرایش"
              className="w-11 h-11 rounded-full flex items-center justify-center text-ink-600 hover:bg-ink-900/[0.05]"
            >
              <Pencil className="w-5 h-5" />
            </button>
          </Bezel>
        ))}
      </div>

      <ProductSheet product={editing} open={open} sellerId={seller.sellerId} onClose={() => setOpen(false)} onSaved={data.reload} />
    </Stagger>
  );
}
