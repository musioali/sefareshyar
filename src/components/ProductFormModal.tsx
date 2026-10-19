import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { Product, PricingMode, ProductTemplate } from '../types';
import { generateRandomToken, formatToman } from '../utils/persianUtils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('fixed');
  const [basePrice, setBasePrice] = useState<number>(200000);
  const [minLeadDays, setMinLeadDays] = useState<number>(2);
  const [template, setTemplate] = useState<ProductTemplate>(null);
  const [available, setAvailable] = useState<boolean>(true);
  const [reorderDays, setReorderDays] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setTitle(productToEdit.title);
      setPricingMode(productToEdit.pricing_mode);
      setBasePrice(productToEdit.base_price);
      setMinLeadDays(productToEdit.min_lead_days);
      setTemplate(productToEdit.template);
      setAvailable(productToEdit.available);
      setReorderDays(productToEdit.reorder_cycle_days ? String(productToEdit.reorder_cycle_days) : '');
    } else {
      setTitle('');
      setPricingMode('fixed');
      setBasePrice(200000);
      setMinLeadDays(2);
      setTemplate(null);
      setAvailable(true);
      setReorderDays('');
    }
    setErrorMsg('');
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('عنوان محصول الزامی است');
      return;
    }

    const prod: Product = {
      // keep fields this form does not edit (recipe, packaging cost, image, ...)
      ...productToEdit,
      id: productToEdit ? productToEdit.id : 'prod_' + generateRandomToken(8),
      title: title.trim(),
      pricing_mode: pricingMode,
      base_price: pricingMode === 'quote' ? 0 : Number(basePrice),
      min_lead_days: Number(minLeadDays) || 0,
      template,
      available,
      fields: productToEdit?.fields || [],
      reorder_cycle_days: Number(reorderDays) > 0 ? Number(reorderDays) : undefined,
    };

    onSave(prod);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                {productToEdit ? 'ویرایش مشخصات محصول' : 'افزودن محصول جدید به فروشگاه'}
              </h3>
              <p className="text-xs text-stone-500">
                بلافاصله در لینک اختصاصی مشتری نمایش داده می‌شود
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-800 mb-1">
              عنوان محصول:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: شمع شیشه‌ای وانیل / پیراهن لینن / کیک تولد"
              className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-stone-800 mb-1">
              نحوه قیمت‌گذاری:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'fixed', label: 'قیمت قطعی (ثابت)' },
                { id: 'options', label: 'گزینه‌دار (آپشن)' },
                { id: 'quote', label: 'استعلام قیمت (سفارشی)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPricingMode(m.id as PricingMode)}
                  className={`p-2 rounded-xl text-center font-bold border transition-all text-xs ${
                    pricingMode === m.id
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {pricingMode !== 'quote' && (
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                قیمت محصول (تومان):
              </label>
              <input
                type="number"
                value={basePrice || ''}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-left"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-800 mb-1">
              قالب سفارشی (فیلدهای ویژه مشتری):
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: null, label: 'بدون قالب (محصول معمولی)' },
                { id: 'dress', label: 'لباس و پوشاک (اندازه‌گیری)' },
                { id: 'painting', label: 'تابلو و نقاشی (قاب + عکس)' },
                { id: 'cake', label: 'کیک و شیرینی (متن دقیق و املا)' },
              ].map((t) => (
                <button
                  key={String(t.id)}
                  type="button"
                  onClick={() => setTemplate(t.id as ProductTemplate)}
                  className={`p-2 rounded-xl text-right font-medium border transition-all ${
                    template === t.id
                      ? 'bg-amber-50 text-amber-900 border-amber-400 font-bold'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                حداقل روز آماده‌سازی:
              </label>
              <input
                type="number"
                value={minLeadDays}
                onChange={(e) => setMinLeadDays(Number(e.target.value))}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-left"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-800 mb-1">
                وضعیت موجودی:
              </label>
              <button
                type="button"
                onClick={() => setAvailable(!available)}
                className={`w-full p-2 rounded-xl font-bold border transition-all ${
                  available
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-stone-100 text-stone-500 border-stone-300'
                }`}
              >
                {available ? '✓ موجود و فعال' : 'ناموجود'}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-800 mb-1">
              مشتری معمولاً هر چند روز یک‌بار دوباره می‌خرد؟
            </label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={reorderDays}
              placeholder="مثلاً ۳۰ (خالی یعنی محصول مصرفی نیست)"
              onChange={(e) => setReorderDays(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl"
            />
            <p className="text-xs text-stone-500 mt-1">
              با این عدد، سفارش‌یار مشتری‌هایی را که موعد خریدشان رسیده در بخش یادآورها نشان می‌دهد.
            </p>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره محصول</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
