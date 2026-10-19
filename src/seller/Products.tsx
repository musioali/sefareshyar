import React, { useEffect, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, TrendingDown } from 'lucide-react';
import { Bezel, Button, Field, IconButton, Sheet, Stagger, TextArea, Toggle, cx } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { Product, ProductField } from '../types';
import { formatToman, generateRandomToken, toEnglishDigits, toPersianDigits } from '../utils/persianUtils';
import { processAndCompressImage } from '../utils/imageUtils';
import { shortTitle } from '../lib/format';
import { optionGroups, splitValues } from '../lib/items';
import type { SellerData } from './SellerApp';

const digits = (v: string) => toEnglishDigits(v).replace(/\D/g, '');

interface GroupDraft {
  key: string;
  label: string;
  values: string;
}

export function profitOf(p: Product): { amount: number; percent: number } | null {
  if (!p.unit_cost) return null;
  const amount = p.base_price - p.unit_cost;
  return { amount, percent: p.base_price ? Math.round((amount / p.base_price) * 100) : 0 };
}

function ProfitLine({ price, cost }: { price: number; cost: number }) {
  if (!cost || !price) return <p className="text-xs text-ink-500">خرج هر عدد را بنویسید تا سودش را ببینید.</p>;
  const amount = price - cost;
  const percent = Math.round((amount / price) * 100);
  if (amount < 0)
    return (
      <p className="flex items-center gap-1 text-xs font-semibold text-rose-700">
        <TrendingDown className="w-4 h-4" /> هر عدد {formatToman(-amount)} زیان
      </p>
    );
  return (
    <p className={cx('text-xs font-semibold', percent < 15 ? 'text-parcel-700' : 'text-leaf-700')}>
      سود هر عدد {formatToman(amount)} ({toPersianDigits(percent)}٪){percent < 15 ? '، کم است' : ''}
    </p>
  );
}

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
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [lead, setLead] = useState('');
  const [cycle, setCycle] = useState('');
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitle(product?.title || '');
    setDescription(product?.description || '');
    setImage(product?.image_b64_small || '');
    setPrice(product ? String(product.base_price) : '');
    setCost(product?.unit_cost ? String(product.unit_cost) : '');
    setLead(product ? String(product.min_lead_days) : '2');
    setCycle(product?.reorder_cycle_days ? String(product.reorder_cycle_days) : '');
    setGroups(
      product ? optionGroups(product).map((g) => ({ key: g.key, label: g.label, values: (g.options || []).map((o) => o.label).join('، ') })) : []
    );
    setErrors({});
  }, [product, open]);

  const onPhoto = async (file: File) => {
    try {
      const r = await processAndCompressImage(file, 480, 0.7);
      setImage(r.dataUrl);
    } catch (e: any) {
      toast(e?.message || 'عکس خوانده نشد', 'error');
    }
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 2) e.title = 'نام محصول را بنویسید.';
    if (Number(digits(price)) < 1000) e.price = 'قیمت را به تومان وارد کنید.';
    groups.forEach((g, i) => {
      if (!g.label.trim()) e[`g${i}`] = 'نام این انتخاب را بنویسید، مثلاً سایز.';
      else if (splitValues(g.values).length < 2) e[`g${i}`] = 'دست‌کم دو گزینه بنویسید و با ویرگول جدا کنید.';
    });
    setErrors(e);
    if (Object.keys(e).length) return;

    const fields: ProductField[] = groups.map((g) => ({
      key: g.key,
      label: g.label.trim(),
      type: 'select',
      required: true,
      options: splitValues(g.values).map((label) => ({ label, price_delta: 0 })),
    }));

    const next: Product = {
      ...(product || {
        id: 'prod_' + generateRandomToken(8),
        available: true,
        pricing_mode: 'fixed',
        template: null,
      }),
      title: title.trim(),
      description: description.trim() || undefined,
      image_b64_small: image || undefined,
      base_price: Number(digits(price)),
      unit_cost: Number(digits(cost)) || undefined,
      min_lead_days: Number(digits(lead)) || 0,
      reorder_cycle_days: Number(digits(cycle)) || undefined,
      fields,
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <label className="relative w-24 h-24 shrink-0 rounded-3xl overflow-hidden bg-white ring-1 ring-ink-900/10 flex items-center justify-center cursor-pointer hover:ring-brand-500">
            {image ? (
              <img src={image} alt="عکس محصول" className="w-full h-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-ink-500">
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">عکس</span>
              </span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          </label>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-ink-800">عکس محصول</p>
            <p className="text-xs text-ink-500">مشتری محصول را با همین عکس می‌شناسد.</p>
            {image && (
              <button onClick={() => setImage('')} className="text-xs font-semibold text-rose-700 min-h-9">
                برداشتن عکس
              </button>
            )}
          </div>
        </div>

        <Field label="نام محصول" placeholder="مثلاً تی‌شرت نخی" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <TextArea
          label="توضیح کوتاه"
          placeholder="مثلاً پنبهٔ صددرصد، چاپ دستی"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="اختیاری. جنس، وزن یا اندازه را اینجا بنویسید."
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="قیمت فروش" ltr inputMode="numeric" suffix="تومان" value={price} onChange={(e) => setPrice(digits(e.target.value))} error={errors.price} />
          <Field label="خرج هر عدد" ltr inputMode="numeric" suffix="تومان" placeholder="اختیاری" value={cost} onChange={(e) => setCost(digits(e.target.value))} />
        </div>
        <div className="-mt-3 px-1">
          <ProfitLine price={Number(digits(price))} cost={Number(digits(cost))} />
        </div>

        {/* options such as size or colour */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900">انتخاب‌ها</h3>
            <p className="text-xs text-ink-500 mt-0.5">اگر محصول سایز، رنگ یا مدل دارد، اینجا تعریف کنید. مشتری موقع سفارش یکی را انتخاب می‌کند.</p>
          </div>
          {groups.map((g, i) => (
            <div key={g.key} className="rounded-3xl bg-white ring-1 ring-ink-900/[0.07] p-4 space-y-3">
              <div className="flex items-end gap-2">
                <Field
                  className="flex-1"
                  label="نام انتخاب"
                  placeholder="سایز"
                  value={g.label}
                  onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <IconButton label="حذف این انتخاب" onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))} className="mb-0.5 text-rose-700">
                  <Trash2 className="w-5 h-5" />
                </IconButton>
              </div>
              <Field
                label="گزینه‌ها"
                placeholder="S، M، L، XL"
                value={g.values}
                onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
                error={errors[`g${i}`]}
                hint="با ویرگول جدا کنید."
              />
              {splitValues(g.values).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {splitValues(g.values).map((v) => (
                    <span key={v} className="rounded-full bg-ink-900/[0.05] px-3 py-1 text-xs font-semibold text-ink-700">
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {groups.length < 3 && (
            <Button
              variant="ghost"
              block
              lead={<Plus className="w-4 h-4" />}
              onClick={() =>
                setGroups((gs) => [...gs, { key: 'opt_' + generateRandomToken(6), label: gs.length === 0 ? 'سایز' : gs.length === 1 ? 'رنگ' : '', values: '' }])
              }
            >
              {groups.length === 0 ? 'افزودن انتخاب، مثلاً سایز' : 'افزودن انتخاب دیگر'}
            </Button>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Field label="آماده‌سازی" ltr inputMode="numeric" suffix="روز" value={lead} onChange={(e) => setLead(digits(e.target.value))} />
          <Field
            label="دوباره می‌خرند هر"
            ltr
            inputMode="numeric"
            suffix="روز"
            placeholder="اختیاری"
            value={cycle}
            onChange={(e) => setCycle(digits(e.target.value))}
          />
        </div>
        <p className="-mt-3 px-1 text-xs text-ink-500">برای محصول مصرفی. با این عدد موعد خرید دوبارهٔ مشتری‌ها را می‌بینید.</p>

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

  const losing = products.filter((p) => (profitOf(p)?.amount ?? 0) < 0);

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

      {losing.length > 0 && (
        <div className="rounded-3xl bg-rose-50 ring-1 ring-rose-600/10 p-4 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <p className="text-sm leading-7 text-rose-800">
            {toPersianDigits(losing.length)} محصول با قیمت فعلی زیان می‌دهد. خرج مواد بالا رفته و قیمت هنوز همان است.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {products.map((p) => {
          const groups = optionGroups(p);
          return (
            <Bezel key={p.id} innerClassName="p-4 flex items-start gap-3">
              {p.image_b64_small ? (
                <img src={p.image_b64_small} alt="" className="w-16 h-16 rounded-2xl object-cover ring-1 ring-ink-900/10 shrink-0" />
              ) : (
                <span className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 text-xl font-extrabold flex items-center justify-center shrink-0">
                  {p.title.charAt(0)}
                </span>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <p className={cx('text-base font-bold leading-snug line-clamp-2', p.available ? 'text-ink-900' : 'text-ink-400')}>{shortTitle(p.title)}</p>
                {p.description && <p className="text-xs text-ink-500 truncate">{p.description}</p>}
                <p className="text-sm text-ink-700 tabular">{formatToman(p.base_price)}</p>
                {groups.map((g) => (
                  <p key={g.key} className="text-xs text-ink-500 truncate">
                    {g.label}: {(g.options || []).map((o) => o.label).join('، ')}
                  </p>
                ))}
                <ProfitLine price={p.base_price} cost={p.unit_cost || 0} />
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Toggle checked={p.available} onChange={(v) => toggle(p, v)} label={p.available ? 'موجود' : 'ناموجود'} />
                <span className="text-xs text-ink-500">{p.available ? 'موجود' : 'ناموجود'}</span>
                <IconButton
                  label="ویرایش"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-5 h-5" />
                </IconButton>
              </div>
            </Bezel>
          );
        })}
      </div>

      <ProductSheet product={editing} open={open} sellerId={seller.sellerId} onClose={() => setOpen(false)} onSaved={data.reload} />
    </Stagger>
  );
}
