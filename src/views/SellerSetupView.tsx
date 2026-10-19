import React, { useState } from 'react';
import {
  Store,
  CreditCard,
  Truck,
  ShoppingBag,
  CheckCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';
import { Seller, Product, BusinessType, PricingMode } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../components/Toast';
import {
  generateRandomToken,
  toPersianDigits,
  formatToman,
  formatCardNumber,
  normalizePhone,
} from '../utils/persianUtils';

interface SellerSetupViewProps {
  onComplete: (sellerId: string) => void;
  onCancel: () => void;
}

export const SellerSetupView: React.FC<SellerSetupViewProps> = ({
  onComplete,
  onCancel,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<number>(1); // 1: shop name & handle, 2: card, 3: business & shipping, 4: first product, 5: finish

  // Step 1: Shop & Handle
  const [shopName, setShopName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleError, setHandleError] = useState('');

  // Step 2: Card
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardError, setCardError] = useState('');

  // Step 3: Business Type & Shipping
  const [businessType, setBusinessType] = useState<BusinessType>('fixed');
  const [shippingCost, setShippingCost] = useState(45000);
  const [freeShippingMin, setFreeShippingMin] = useState(3);
  const [depositPercent, setDepositPercent] = useState(100);

  // Step 4: First Product
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState<number>(250000);
  const [productPricingMode, setProductPricingMode] = useState<PricingMode>('fixed');
  const [productLeadDays, setProductLeadDays] = useState(2);

  // Completed Seller
  const [createdSeller, setCreatedSeller] = useState<Seller | null>(null);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isCopiedQuickReply, setIsCopiedQuickReply] = useState(false);
  const [showDirectGuide, setShowDirectGuide] = useState(false);

  // Step 1 check
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandleError('');

    if (!shopName.trim()) {
      setHandleError('نام فروشگاه را وارد کنید');
      return;
    }

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!cleanHandle) {
      setHandleError('آیدی اینستاگرام (handle) باید انگلیسی باشد');
      return;
    }

    const isAvail = await dataService.checkHandleAvailable(cleanHandle);
    if (!isAvail) {
      setHandleError('این آیدی قبلاً ثبت شده است. لطفاً آیدی دیگری انتخاب کنید.');
      return;
    }

    setHandle(cleanHandle);
    setStep(2);
  };

  // Step 2 check
  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError('');
    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length !== 16) {
      setCardError('شماره کارت باید ۱۶ رقم باشد');
      return;
    }
    if (!cardHolder.trim()) {
      setCardError('نام صاحب کارت را وارد کنید');
      return;
    }
    setStep(3);
  };

  // Step 3 check
  const handleStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

  // Step 4: Finalize
  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productTitle.trim()) {
      showToast('لطفاً عنوان اولین محصول فروشگاه را وارد کنید', 'error');
      return;
    }

    const sellerId = 'seller_' + generateRandomToken(8);
    const newSeller: Seller = {
      sellerId,
      shop_name: shopName.trim(),
      handle: handle.trim().toLowerCase(),
      card_number: cardNumber.replace(/\D/g, ''),
      card_holder_name: cardHolder.trim(),
      business_type: businessType,
      shipping_default_cost: shippingCost,
      free_shipping_min_items: freeShippingMin,
      deposit_percent_default: depositPercent,
      is_accepting_orders: true,
      created_at: new Date().toISOString(),
    };

    const firstProduct: Product = {
      id: 'prod_' + generateRandomToken(8),
      title: productTitle.trim(),
      available: true,
      min_lead_days: productLeadDays,
      pricing_mode: productPricingMode,
      base_price: productPrice,
      fields: [],
      template: null,
    };

    await dataService.saveSeller(newSeller);
    await dataService.saveProduct(sellerId, firstProduct);
    dataService.setCurrentSellerId(sellerId);
    setCreatedSeller(newSeller);
    setStep(5);
  };

  const shopUrl = createdSeller
    ? `${window.location.origin}${window.location.pathname}#/s/${createdSeller.handle}`
    : '';

  const quickReplyText = `سلام 🌸 برای ثبت سفارش از این لینک استفاده کنید: ${shopUrl}`;

  return (
    <div className="min-h-dvh bg-paper max-w-lg mx-auto flex flex-col px-6 pt-4 pb-6">
      {/* Header */}
      <header className="pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            aria-label="بستن"
            className="w-11 h-11 -mr-2.5 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-200/60"
          >
            <X className="w-5 h-5" />
          </button>
          {step < 5 && (
            <span className="text-xs text-stone-500">قدم {toPersianDigits(step)} از ۴</span>
          )}
        </div>
        {step < 5 && (
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-stone-200'}`} />
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Step 1: Shop Name & Handle */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4 animate-in fade-in">
<div className="space-y-1.5 pb-1">
              <h1 className="text-xl font-extrabold text-stone-900">فروشگاهتان را معرفی کنید</h1>
              <p className="text-sm leading-7 text-stone-600">مشتری این نام را بالای صفحهٔ سفارش می‌بیند.</p>
            </div>

            {handleError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {handleError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                نام فروشگاه
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="مثال: گالری رز، بوتیک نیلوفر، قهوه آریا، ..."
                className="w-full h-12 px-3.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                آیدی پیج اینستاگرام
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">@</span>
                <input
                  type="text"
                  dir="ltr"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  placeholder="rose_gallery"
                  className="w-full h-12 px-3.5 pl-8 bg-white border border-stone-300 rounded-xl text-sm text-left text-stone-900 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <span className="text-xs text-stone-400 block mt-1">
                لینک سفارش شما: <span dir="ltr">{window.location.host}/#/s/{handle || 'your_page'}</span>
              </span>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="h-12 px-5 bg-stone-200/70 hover:bg-stone-200 text-stone-800 rounded-xl text-sm font-semibold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>ادامه به اطلاعات کارت</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Card & Bank */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4 animate-in fade-in">
<div className="space-y-1.5 pb-1">
              <h1 className="text-xl font-extrabold text-stone-900">پول را به کجا واریز کنند؟</h1>
              <p className="text-sm leading-7 text-stone-600">مشتری بعد از انتخاب محصول این کارت را می‌بیند و فیش واریز را همان‌جا می‌فرستد.</p>
            </div>

            {cardError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {cardError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                شماره کارت بانکی (۱۶ رقم)
              </label>
              <input
                type="text"
                dir="ltr"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="6037-xxxx-xxxx-xxxx"
                className="w-full h-12 px-3.5 bg-white border border-stone-300 rounded-xl text-sm text-left text-stone-900 focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                نام دارنده حساب
              </label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="مثال: نورا رضایی"
                className="w-full h-12 px-3.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-12 px-5 bg-stone-200/70 hover:bg-stone-200 text-stone-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>ادامه به تنظیمات ارسال</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Business Type & Shipping */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4 animate-in fade-in text-xs">
<div className="space-y-1.5 pb-1">
              <h1 className="text-xl font-extrabold text-stone-900">ارسال و پرداخت</h1>
              <p className="text-sm leading-7 text-stone-600">این تنظیمات روی جمع فاکتور مشتری اثر می‌گذارد.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                نوع محصولات فروشگاه شما
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'fixed', label: 'محصولات آماده' },
                  { id: 'custom', label: 'محصولات سفارشی' },
                  { id: 'both', label: 'هر دو حالت' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBusinessType(b.id as BusinessType)}
                    className={`py-2 px-1 text-center rounded-xl font-bold border transition-all ${
                      businessType === b.id
                        ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                هزینه ارسال پیش‌فرض مرسوله (تومان)
              </label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-left"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                ارسال رایگان از چند عدد محصول؟
              </label>
              <input
                type="number"
                value={freeShippingMin}
                onChange={(e) => setFreeShippingMin(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-left"
              />
              <span className="text-xs text-stone-500 mt-0.5 block">
                اگر مشتری {toPersianDigits(freeShippingMin)} عدد یا بیشتر سفارش دهد، هزینه ارسال صفر خواهد شد.
              </span>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-12 px-5 bg-stone-200/70 hover:bg-stone-200 text-stone-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>ادامه به اولین محصول</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 4: First Product */}
        {step === 4 && (
          <form onSubmit={handleStep4} className="space-y-4 animate-in fade-in text-xs">
<div className="space-y-1.5 pb-1">
              <h1 className="text-xl font-extrabold text-stone-900">اولین محصولتان</h1>
              <p className="text-sm leading-7 text-stone-600">بعداً از بخش محصولات می‌توانید بقیه را اضافه کنید.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                عنوان محصول
              </label>
              <input
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="مثال: پیراهن لینن نچرال، ماگ سرامیکی، کیف چرمی، ..."
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                قیمت محصول (تومان)
              </label>
              <input
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-left"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                مدت زمان آماده‌سازی (روز کاری)
              </label>
              <input
                type="number"
                value={productLeadDays}
                onChange={(e) => setProductLeadDays(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-left"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="h-12 px-5 bg-stone-200/70 hover:bg-stone-200 text-stone-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تکمیل و راه‌اندازی فروشگاه</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 5: Finish & Instagram Quick Reply Setup Guide (PRD Section 9) */}
        {step === 5 && createdSeller && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900">
                فروشگاه {createdSeller.shop_name} آماده است
              </h2>
              <p className="text-xs text-stone-500">
                این لینک را در بیو بگذارید یا در جواب دایرکت بفرستید.
              </p>
            </div>

            {/* Direct Link */}
            <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-stone-800 block">لینک سفارش</span>
              <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs font-mono text-stone-700 truncate max-w-[200px]" dir="ltr">
                  {shopUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shopUrl);
                    setIsCopiedLink(true);
                    setTimeout(() => setIsCopiedLink(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-brand-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopiedLink ? 'کپی شد' : 'کپی'}</span>
                </button>
              </div>
            </div>

            {/* Quick Reply Template */}
            <div className="p-3.5 bg-brand-50 rounded-2xl border border-brand-200 text-xs space-y-2">
              <div className="font-bold text-brand-900">پیام آماده برای جواب دایرکت</div>
              <div className="p-2.5 bg-white rounded-xl border border-brand-200 text-stone-800 text-xs leading-relaxed">
                {quickReplyText}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(quickReplyText);
                  setIsCopiedQuickReply(true);
                  setTimeout(() => setIsCopiedQuickReply(false), 2000);
                }}
                className="w-full py-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1 shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isCopiedQuickReply ? 'متن پاسخ سریع کپی شد!' : 'کپی متن پاسخ سریع'}</span>
              </button>
            </div>

            {/* Short Guide: How to save Quick Reply in Instagram */}
            <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200 text-xs space-y-1.5 text-stone-700">
              <div
                className="font-bold flex items-center justify-between cursor-pointer"
                onClick={() => setShowDirectGuide(!showDirectGuide)}
              >
                <span>چطور این پیام را در دایرکت اینستاگرام ذخیره کنم؟</span>
                <HelpCircle className="w-4 h-4 text-stone-500" />
              </div>
              {showDirectGuide && (
                <ol className="list-decimal list-inside text-xs text-stone-600 space-y-1 pt-1 leading-relaxed">
                  <li>در اپ اینستاگرام به بخش دایرکت (Direct Messages) بروید.</li>
                  <li>وارد یک چت شوید و روی دکمهٔ سه‌نقطه یا علامت پیام با سه نقطه (+) بزنید.</li>
                  <li>گزینهٔ <b>Saved replies</b> یا <b>پاسخ‌های ذخیره‌شده</b> را انتخاب کنید.</li>
                  <li>یک کلیدواژه مثل «سفارش» بگذارید و متن بالا را جای‌گذاری (Paste) کنید.</li>
                </ol>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => onComplete(createdSeller.sellerId)}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>ورود به پنل مدیریت {createdSeller.shop_name}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = `#/s/${createdSeller.handle}`;
                }}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs transition-colors"
              >
                ببینید مشتری چه می‌بیند
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
