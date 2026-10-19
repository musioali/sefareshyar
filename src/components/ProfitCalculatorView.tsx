import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  HelpCircle,
  Package,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Product, Material } from '../types';
import { formatToman, toPersianDigits } from '../utils/persianUtils';

interface ProfitCalculatorViewProps {
  products: Product[];
  materials: Material[];
  onBack: () => void;
  onSaveMaterial: (material: Material) => void;
  onSaveProduct: (product: Product) => void;
}

export const ProfitCalculatorView: React.FC<ProfitCalculatorViewProps> = ({
  products,
  materials,
  onBack,
  onSaveMaterial,
  onSaveProduct,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'materials'>('products');
  const [showCaseStudy, setShowCaseStudy] = useState(true);

  // New material form
  const [matName, setMatName] = useState('');
  const [matUnit, setMatUnit] = useState<'g' | 'ml' | 'pcs'>('g');
  const [matPurchasePrice, setMatPurchasePrice] = useState<number>(3000000);
  const [matPurchaseQty, setMatPurchaseQty] = useState<number>(5000);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  const calculateProductEconomics = (product: Product) => {
    let materialCost = 0;
    if (product.recipe && product.recipe.length > 0) {
      for (const item of product.recipe) {
        const mat = materials.find((m) => m.id === item.material_id);
        const unitCost = mat?.cost_per_unit || item.cost_per_unit || 0;
        materialCost += item.qty * unitCost;
      }
    }
    const packagingCost = product.packaging_cost || 0;
    const totalCost = materialCost + packagingCost;
    const sellingPrice = product.base_price;
    const profit = sellingPrice - totalCost;
    const marginPercent = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100) : 0;
    const isLoss = profit < 0;
    const isLowMargin = marginPercent < 20;

    return {
      materialCost,
      packagingCost,
      totalCost,
      sellingPrice,
      profit,
      marginPercent,
      isLoss,
      isLowMargin,
    };
  };

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    const costPerUnit = Math.round(matPurchasePrice / (matPurchaseQty || 1));
    const newMat: Material = {
      id: 'mat_' + Date.now(),
      name: matName.trim(),
      unit: matUnit,
      purchase_price: matPurchasePrice,
      purchase_qty: matPurchaseQty,
      cost_per_unit: costPerUnit,
    };
    onSaveMaterial(newMat);
    setMatName('');
    setIsAddingMaterial(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-stone-600 font-bold flex items-center gap-1 hover:text-stone-900"
        >
          <ChevronRight className="w-4 h-4" />
          <span>بازگشت به منوی بیشتر</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>ماشین‌حساب سود و بهای تمام‌شده («چراغ سود»)</span>
        </div>
      </div>

      {/* Case Study Alert Box from PRD Section 16 */}
      {showCaseStudy && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1.5 text-amber-950">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>قیمت فعلی نورا روی شمع‌ها ضرر می‌دهد</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCaseStudy(false)}
              className="text-[10px] text-amber-700 underline"
            >
              بستن
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-700">
            طبق دفتر هزینه‌های نورا، موم از اردیبهشت ۲۰٪ گران‌تر شده ولی قیمت‌ها از اول سال ثابت مانده. شمع کوچک ۲۶۰ هزار تومان فروخته می‌شود و اگر تنها ارسال شود، موم و شیشه و اسانس و فتیله و جعبه و کارتنش <b>۲۷۲ هزار تومان</b> خرج دارد. شمع بزرگ ۴۲۰ هزار تومان است و <b>۴۶۱ هزار تومان</b> خرج دارد. در نظرسنجی هم ۸۲٪ فروشنده‌ها قیمت تمام‌شده را دقیق حساب نکرده بودند. این ماشین‌حساب نشان می‌دهد کدام محصول سود دارد و کدام ضرر.
          </p>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`py-2 rounded-xl font-bold border transition-all ${
            activeSubTab === 'products'
              ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
              : 'bg-white text-stone-600 border-stone-200'
          }`}
        >
          سود و زیان هر محصول ({toPersianDigits(products.length)})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('materials')}
          className={`py-2 rounded-xl font-bold border transition-all ${
            activeSubTab === 'materials'
              ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
              : 'bg-white text-stone-600 border-stone-200'
          }`}
        >
          جدول مواد اولیه ({toPersianDigits(materials.length)})
        </button>
      </div>

      {/* Tab: Products Profit Lights */}
      {activeSubTab === 'products' && (
        <div className="space-y-3">
          {products.map((p) => {
            const eco = calculateProductEconomics(p);
            const hasRecipe = p.recipe && p.recipe.length > 0;

            return (
              <div
                key={p.id}
                className={`p-4 bg-white rounded-2xl border shadow-xs space-y-2.5 transition-all ${
                  eco.isLoss
                    ? 'border-rose-400 ring-1 ring-rose-200'
                    : eco.isLowMargin
                    ? 'border-amber-300'
                    : 'border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900">{p.title}</h4>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      قیمت فروش به مشتری: <b>{formatToman(p.base_price)}</b>
                    </div>
                  </div>

                  {/* Profit Light Badge */}
                  <div>
                    {eco.isLoss ? (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-black flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>🔴 زیان: {formatToman(Math.abs(eco.profit))}</span>
                      </span>
                    ) : eco.isLowMargin ? (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-black flex items-center gap-1">
                        <span>🟡 سود کم: {formatToman(eco.profit)} ({toPersianDigits(eco.marginPercent)}٪)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>🟢 سود عالی: {formatToman(eco.profit)} ({toPersianDigits(eco.marginPercent)}٪)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost Breakdown */}
                {hasRecipe ? (
                  <div className="p-2.5 bg-stone-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>هزینه مواد اولیه مصرفی:</span>
                      <span className="font-mono">{formatToman(eco.materialCost)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>هزینه بسته‌بندی، کارتن و برچسب:</span>
                      <span className="font-mono">{formatToman(eco.packagingCost)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-900 border-t pt-1">
                      <span>کل بهای تمام‌شده ساخت:</span>
                      <span className={eco.isLoss ? 'text-rose-600' : 'text-stone-900'}>
                        {formatToman(eco.totalCost)}
                      </span>
                    </div>

                    {eco.isLoss && (
                      <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded-lg font-medium mt-1">
                        پیشنهاد: برای رسیدن به سود ۳۰٪، قیمت این محصول را به{' '}
                        <b>{formatToman(Math.round(eco.totalCost * 1.35))}</b> تغییر دهید.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-stone-50 rounded-xl text-[11px] text-stone-500 flex items-center justify-between">
                    <span>دستور ساخت (مواد مصرفی) هنوز تعریف نشده است.</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Quick default recipe
                        const updated = {
                          ...p,
                          recipe: [
                            { material_id: materials[0]?.id || 'mat_1', qty: 150 },
                          ],
                          packaging_cost: 25000,
                        };
                        onSaveProduct(updated);
                      }}
                      className="text-amber-800 underline font-bold"
                    >
                      افزودن مواد اولیه پیش‌فرض
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Materials Table */}
      {activeSubTab === 'materials' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-stone-800">فهرست مواد اولیه و ملزومات:</span>
            <button
              type="button"
              onClick={() => setIsAddingMaterial(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ماده اولیه جدید</span>
            </button>
          </div>

          {/* Add Material Form */}
          {isAddingMaterial && (
            <form onSubmit={handleAddMaterialSubmit} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-stone-800">افزودن ماده اولیه جدید:</div>
              <div>
                <label className="block text-[11px] text-stone-600 mb-0.5">نام ماده یا ملزومات:</label>
                <input
                  type="text"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="مثال: پارچه لینن، موم سویا، رنگ روغن..."
                  className="w-full p-2 bg-white border rounded-lg"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">واحد:</label>
                  <select
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value as any)}
                    className="w-full p-2 bg-white border rounded-lg"
                  >
                    <option value="g">گرم (g)</option>
                    <option value="ml">میلی‌لیتر (ml)</option>
                    <option value="pcs">عدد (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">قیمت خرید (تومان):</label>
                  <input
                    type="number"
                    value={matPurchasePrice}
                    onChange={(e) => setMatPurchasePrice(Number(e.target.value))}
                    className="w-full p-2 bg-white border rounded-lg font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-0.5">مقدار کل خرید:</label>
                  <input
                    type="number"
                    value={matPurchaseQty}
                    onChange={(e) => setMatPurchaseQty(Number(e.target.value))}
                    className="w-full p-2 bg-white border rounded-lg font-mono text-left"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingMaterial(false)}
                  className="flex-1 py-1.5 bg-stone-200 text-stone-700 rounded-lg font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-amber-600 text-white rounded-lg font-bold"
                >
                  ذخیره ماده
                </button>
              </div>
            </form>
          )}

          {/* List of Materials */}
          <div className="space-y-2">
            {materials.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-stone-900">{m.name}</span>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    خرید: {toPersianDigits(m.purchase_qty)} {m.unit} به قیمت {formatToman(m.purchase_price)}
                  </div>
                </div>
                <div className="text-left font-mono font-bold text-stone-900 bg-stone-100 px-2 py-1 rounded-md">
                  {formatToman(m.cost_per_unit)} / {m.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
