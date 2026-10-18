import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Plus,
  Minus,
  AlertTriangle,
  Upload,
  CreditCard,
  Gift,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { PublicShop, Product, CustomerHint, OrderItem, OrderFile } from '../types';
import { dataService } from '../services/dataService';
import {
  toEnglishDigits,
  toPersianDigits,
  formatToman,
  normalizePhone,
  isValidIranPhone,
  formatCardNumber,
} from '../utils/persianUtils';
import { processAndCompressImage } from '../utils/imageUtils';
import { ImageModal } from '../components/ImageModal';
import { useToast } from '../components/Toast';

interface CustomerFormViewProps {
  handle: string;
  onNavigateToTrack: (orderId: string) => void;
  onNavigateToPanel: () => void;
}

const STORAGE_SESSION_KEY = 'sefareshyar_customer_session';

export const CustomerFormView: React.FC<CustomerFormViewProps> = ({
  handle,
  onNavigateToTrack,
  onNavigateToPanel,
}) => {
  const { showToast } = useToast();
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(1); // 1: phone, 2: products, 3: address, 4: payment, 5: confirmation

  // Customer State
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [customerHint, setCustomerHint] = useState<CustomerHint | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [useSavedMeasurements, setUseSavedMeasurements] = useState(true);

  // Cart / Items State
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [productCustomFields, setProductCustomFields] = useState<Record<string, Record<string, any>>>({});
  const [spellcheckApproved, setSpellcheckApproved] = useState<Record<string, boolean>>({});
  const [referencePhotos, setReferencePhotos] = useState<Record<string, OrderFile[]>>({});
  const [photoQualityWarning, setPhotoQualityWarning] = useState<string | null>(null);
  const [hasLowQualityPhoto, setHasLowQualityPhoto] = useState(false);

  // Address State
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Payment State
  const [receiptFile, setReceiptFile] = useState<OrderFile | null>(null);
  const [claimedDeposit, setClaimedDeposit] = useState<number>(0);
  const [claimedTime, setClaimedTime] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot hidden field
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Confirmation State
  const [createdOrderShortCode, setCreatedOrderShortCode] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [isCopiedCard, setIsCopiedCard] = useState(false);
  const [isCopiedTrackLink, setIsCopiedTrackLink] = useState(false);

  // Zoomable receipt modal
  const [zoomReceipt, setZoomReceipt] = useState(false);

  // Load shop
  useEffect(() => {
    async function loadShopData() {
      setLoading(true);
      try {
        const found = await dataService.getSellerByHandle(handle);
        setShop(found);
        if (found) {
          await dataService.logEvent(found.seller_id, 'form_opened', { handle });
        }
      } catch (e) {
        console.error('Failed to load shop', e);
      } finally {
        setLoading(false);
      }
    }
    loadShopData();
  }, [handle]);

  // Restore session if available
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_SESSION_KEY}_${handle}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.recipientName) setRecipientName(parsed.recipientName);
        if (parsed.city) setCity(parsed.city);
        if (parsed.address) setAddress(parsed.address);
      }
    } catch {
      // ignore
    }
  }, [handle]);

  // Save session state
  const saveSession = () => {
    try {
      sessionStorage.setItem(
        `${STORAGE_SESSION_KEY}_${handle}`,
        JSON.stringify({
          phone,
          recipientName,
          city,
          address,
        })
      );
    } catch {
      // ignore
    }
  };

  // Step 1: Phone check
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    const normalized = normalizePhone(phone);
    if (!isValidIranPhone(normalized)) {
      setPhoneError('شماره موبایل وارد شده باید ۱۱ رقمی و با ۰۹ شروع شود');
      return;
    }

    if (shop) {
      const hint = await dataService.getCustomerHint(shop.seller_id, normalized);
      setCustomerHint(hint);
      if (hint?.has_address) {
        setUseSavedAddress(true);
        if (hint.saved_address) {
          if (hint.saved_address.recipient_name && !recipientName) setRecipientName(hint.saved_address.recipient_name);
          if (hint.saved_address.city && !city) setCity(hint.saved_address.city);
          if (hint.saved_address.address && !address) setAddress(hint.saved_address.address);
          if (hint.saved_address.postal_code && !postalCode) setPostalCode(hint.saved_address.postal_code);
        }
      } else {
        setUseSavedAddress(false);
      }
      await dataService.logEvent(shop.seller_id, 'phone_entered', { hasHint: Boolean(hint) });
    }

    saveSession();
    setStep(2);
  };

  // Re-order previous item shortcut
  const handleRepeatPrevious = (productTitle: string) => {
    if (!shop) return;
    const prod = shop.products.find((p) => p.title === productTitle);
    if (prod && prod.available) {
      setCartQuantities({ [prod.id]: 1 });
      setStep(3);
    } else {
      setStep(2);
    }
  };

  // Cart Qty changes
  const handleQtyChange = (prodId: string, delta: number) => {
    setCartQuantities((prev) => {
      const curr = prev[prodId] || 0;
      const next = Math.max(0, curr + delta);
      return { ...prev, [prodId]: next };
    });
  };

  // Photo upload handling for custom painting
  const handlePhotoUpload = async (prodId: string, file: File) => {
    try {
      const result = await processAndCompressImage(file, 1600, 0.7);
      if (result.isLowQuality && result.warningReason) {
        setPhotoQualityWarning(result.warningReason);
        setHasLowQualityPhoto(true);
      } else {
        setPhotoQualityWarning(null);
      }

      const orderFile: OrderFile = {
        kind: 'customer_photo',
        data_b64: result.dataUrl,
        width: result.width,
        height: result.height,
        bytes: result.compressedBytes,
      };

      setReferencePhotos((prev) => ({
        ...prev,
        [prodId]: [...(prev[prodId] || []), orderFile],
      }));
      showToast('عکس نمونه با موفقیت پیوست شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در بارگذاری عکس', 'error');
    }
  };

  // Slip upload handling
  const handleReceiptUpload = async (file: File) => {
    try {
      const result = await processAndCompressImage(file, 1200, 0.7);
      const fileObj: OrderFile = {
        kind: 'receipt',
        data_b64: result.dataUrl,
        width: result.width,
        height: result.height,
        bytes: result.compressedBytes,
      };
      setReceiptFile(fileObj);
      showToast('تصویر فیش واریزی با موفقیت بارگذاری شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در پردازش تصویر فیش', 'error');
    }
  };

  // Calculate pricing
  const calculateTotals = () => {
    if (!shop) return { subtotal: 0, shippingCost: 0, totalAmount: 0, payableAmount: 0, totalQty: 0, hasQuoteItem: false };

    let subtotal = 0;
    let totalQty = 0;
    let hasQuoteItem = false;

    for (const prod of shop.products) {
      const qty = cartQuantities[prod.id] || 0;
      if (qty > 0) {
        totalQty += qty;
        if (prod.pricing_mode === 'quote') {
          hasQuoteItem = true;
        } else {
          let itemPrice = prod.base_price;
          // Add options deltas
          const customFields = productCustomFields[prod.id] || {};
          if (prod.fields) {
            for (const f of prod.fields) {
              if (f.options && customFields[f.key]) {
                const opt = f.options.find((o) => o.label === customFields[f.key]);
                if (opt?.price_delta) {
                  itemPrice += opt.price_delta;
                }
              }
            }
          }
          subtotal += itemPrice * qty;
        }
      }
    }

    const freeMin = shop.free_shipping_min_items || 3;
    const shippingCost = hasQuoteItem || totalQty >= freeMin || totalQty === 0 ? 0 : (shop.shipping_default_cost || 45000);
    const totalAmount = subtotal + shippingCost;

    // Deposit calculation
    const depositPercent = shop.deposit_percent_default || 100;
    const payableAmount = hasQuoteItem ? 0 : Math.round((totalAmount * depositPercent) / 100);

    return { subtotal, shippingCost, totalAmount, payableAmount, totalQty, hasQuoteItem };
  };

  const { subtotal, shippingCost, totalAmount, payableAmount, totalQty, hasQuoteItem } = calculateTotals();

  // Initialize claimedDeposit to payableAmount
  useEffect(() => {
    if (payableAmount > 0 && claimedDeposit === 0) {
      setClaimedDeposit(payableAmount);
    }
  }, [payableAmount]);

  // Step 2 Validation: Check required fields for selected items
  const handleProceedToAddress = () => {
    if (totalQty === 0) {
      showToast('لطفاً حداقل یک محصول را برای سفارش انتخاب کنید.', 'error');
      return;
    }

    // Validate templates
    for (const prod of shop?.products || []) {
      const qty = cartQuantities[prod.id] || 0;
      if (qty > 0) {
        // Cake check
        if (prod.template === 'cake' || prod.template === 'name_necklace') {
          if (!spellcheckApproved[prod.id]) {
            showToast(`لطفاً تایید املای متن سفارش برای «${prod.title}» را علامت بزنید.`, 'error');
            return;
          }
        }
        // Painting check: Frame option required
        if (prod.template === 'painting') {
          const fields = productCustomFields[prod.id] || {};
          if (!fields['frame']) {
            showToast(`لطفاً وضعیت «قاب دارد/ندارد» را برای «${prod.title}» مشخص کنید.`, 'error');
            return;
          }
        }
        // Dress check: measurements
        if (prod.template === 'dress') {
          if (!useSavedMeasurements) {
            const fields = productCustomFields[prod.id] || {};
            if (!fields['chest'] || !fields['waist'] || !fields['hip'] || !fields['height']) {
              showToast(`لطفاً اندازه‌های مورد نیاز لباس «${prod.title}» را کامل وارد کنید.`, 'error');
              return;
            }
          }
        }
      }
    }

    saveSession();
    setStep(3);
  };

  // Step 3 Validation: Address
  const handleProceedToPayment = () => {
    setAddressError('');
    const isUsingSaved = useSavedAddress && Boolean(customerHint?.has_address) && !isGift;
    if (!isUsingSaved) {
      if (!recipientName.trim()) {
        setAddressError('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید');
        return;
      }
      if (isGift && !isValidIranPhone(recipientPhone)) {
        setAddressError('شماره تماس گیرنده هدیه نامعتبر است (۱۱ رقمی با ۰۹)');
        return;
      }
      if (!city.trim()) {
        setAddressError('لطفاً نام شهر یا استان را وارد کنید');
        return;
      }
      if (!address.trim()) {
        setAddressError('لطفاً نشانی کامل و دقیق پستی را وارد کنید');
        return;
      }
    } else {
      // Sync from saved address
      if (customerHint?.saved_address) {
        if (!recipientName.trim()) setRecipientName(customerHint.saved_address.recipient_name || customerHint.first_name || '');
        if (!city.trim()) setCity(customerHint.saved_address.city || customerHint.city || '');
        if (!address.trim()) setAddress(customerHint.saved_address.address || '');
        if (!postalCode.trim() && customerHint.saved_address.postal_code) setPostalCode(customerHint.saved_address.postal_code);
      }
    }
    saveSession();
    setStep(4);
  };

  // Final Order Submission
  const handleFinalSubmit = async () => {
    if (!shop) return;
    setSubmitError('');

    // Honeypot check
    if (honeypot.trim()) {
      console.warn('Bot detected via honeypot');
      return;
    }

    // If not quote, receipt is mandatory
    if (!hasQuoteItem && !receiptFile) {
      setSubmitError('بارگذاری تصویر فیش واریزی الزامی است.');
      return;
    }

    setIsSubmitting(true);
    try {
      const items: OrderItem[] = [];
      const orderFiles: OrderFile[] = [];

      if (receiptFile) {
        orderFiles.push(receiptFile);
      }

      for (const prod of shop.products) {
        const qty = cartQuantities[prod.id] || 0;
        if (qty > 0) {
          let unitPrice = prod.base_price;
          const customFields = productCustomFields[prod.id] || {};
          if (prod.fields) {
            for (const f of prod.fields) {
              if (f.options && customFields[f.key]) {
                const opt = f.options.find((o) => o.label === customFields[f.key]);
                if (opt?.price_delta) {
                  unitPrice += opt.price_delta;
                }
              }
            }
          }

          // Add reference photos if any
          if (referencePhotos[prod.id]) {
            orderFiles.push(...referencePhotos[prod.id]);
          }

          items.push({
            product_id: prod.id,
            title: prod.title,
            qty,
            unit_price: unitPrice,
            fields_values: {
              ...customFields,
              ...(useSavedMeasurements && prod.template === 'dress'
                ? { _use_saved_measurements: true }
                : {}),
            },
          });
        }
      }

      const initialStatus = hasQuoteItem ? 'awaiting_quote' : 'submitted';

      const orderData = {
        seller_id: shop.seller_id,
        customer_name: recipientName.trim() || customerHint?.first_name || 'مشتری اینستاگرام',
        phone: normalizePhone(phone),
        items,
        subtotal,
        shipping_cost: shippingCost,
        discount: 0,
        total_amount: totalAmount,
        deposit_required: payableAmount,
        deposit_paid_claimed: claimedDeposit,
        paid_at_claimed: claimedTime.trim() || undefined,
        ship_to: {
          name: isGift && recipientName ? recipientName.trim() : (recipientName.trim() || customerHint?.saved_address?.recipient_name || customerHint?.first_name || 'مشتری'),
          phone: isGift && recipientPhone ? normalizePhone(recipientPhone) : normalizePhone(phone),
          city: city.trim() || customerHint?.saved_address?.city || customerHint?.city || 'تهران',
          address: isGift || !useSavedAddress
            ? address.trim()
            : (customerHint?.saved_address?.address || address.trim() || 'آدرس ذخیره‌شده مشتری'),
          postal_code: postalCode.trim() || customerHint?.saved_address?.postal_code || undefined,
          is_gift: isGift,
        },
        flags: {
          low_quality_photo: hasLowQualityPhoto,
          price_mismatch: !hasQuoteItem && claimedDeposit !== payableAmount,
        },
        status: initialStatus as any,
        files: orderFiles,
      };

      const result = await dataService.createOrder(orderData);
      setCreatedOrderShortCode(result.order.short_code);
      setCreatedOrderId(result.order.orderId);
      setStep(5);
    } catch (err: any) {
      setSubmitError(err.message || 'خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCardNumber = () => {
    if (!shop?.card_number) return;
    navigator.clipboard.writeText(shop.card_number);
    setIsCopiedCard(true);
    setTimeout(() => setIsCopiedCard(false), 2000);
  };

  const copyTrackLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/track/${createdOrderId}`;
    navigator.clipboard.writeText(url);
    setIsCopiedTrackLink(true);
    setTimeout(() => setIsCopiedTrackLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">در حال بارگذاری اطلاعات فروشگاه...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center">
        <div className="max-w-xs bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-stone-900 mb-1">فروشگاه یافت نشد</h2>
          <p className="text-xs text-stone-600 mb-4">
            لینک فروشگاه معتبر نیست یا صفحه تغییر کرده است.
          </p>
          <button
            onClick={onNavigateToPanel}
            className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-medium"
          >
            ورود به پنل فروشندگان
          </button>
        </div>
      </div>
    );
  }

  // Shop closed / not accepting orders (PRD Section 8.1)
  if (!shop.is_accepting_orders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center">
        <div className="max-w-sm bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-1">{shop.shop_name}</h2>
          <div className="inline-block px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold mb-3">
            فعلاً سفارش نمی‌پذیریم
          </div>
          <p className="text-xs text-stone-600 leading-relaxed mb-4">
            ظرفیت سفارش‌های جاری تکمیل شده است یا فروشگاه در حال آماده‌سازی سفارش‌های ثبت‌شده است. به زودی ثبت سفارش مجدداً بازگشایی خواهد شد.
          </p>
          <div className="text-[11px] text-stone-400">
            برای اطلاع از زمان ثبت سفارش به دایرکت پیج پیام دهید.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between max-w-md mx-auto shadow-md border-x border-stone-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {shop.shop_name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-sm leading-tight">{shop.shop_name}</h1>
              <span className="text-[11px] text-stone-500 font-mono" dir="ltr">
                @{shop.handle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
            <span>گام {toPersianDigits(step)} از ۵</span>
          </div>
        </div>

        {/* 5-Step Progress Bar */}
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-amber-600' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-28">
        {/* STEP 1: Phone & Customer Identity */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center pt-2">
              <h2 className="text-lg font-black text-stone-900 mb-1">شماره همراه خود را وارد کنید</h2>
              <p className="text-xs text-stone-500">
                جهت شناسایی سفارش و پیگیری وضعیت ارسال مرسوله
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  شماره موبایل:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full text-center text-lg tracking-widest font-mono py-3.5 px-4 bg-white border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
                    autoFocus
                  />
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">{phoneError}</p>
                )}
              </div>

              {/* Privacy badge (PRD Section 13) */}
              <div className="p-3 bg-stone-100 rounded-2xl flex items-start gap-2.5 text-stone-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  اطلاعات شما فقط برای ارسال سفارش و پیگیری نزد {shop.shop_name} محفوظ می‌ماند و در هیچ جای دیگر منتشر نمی‌شود.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>ادامه به انتخاب محصول</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Product Catalog & Customization */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Returning customer greeting banner */}
            {customerHint && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-stone-800 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>خوش برگشتی {customerHint.first_name}!</span>
                </div>
                {customerHint.last_product_title && (
                  <div className="text-xs text-stone-600 flex items-center justify-between">
                    <span>آخرین خرید شما: {customerHint.last_product_title}</span>
                    <button
                      type="button"
                      onClick={() => handleRepeatPrevious(customerHint.last_product_title)}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700"
                    >
                      تکرار همین سفارش
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Free Shipping Callout */}
            {shop.free_shipping_min_items && (
              <div className="text-[11px] bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between font-medium">
                <span>🎁 ارسال رایگان برای سفارش‌های {toPersianDigits(shop.free_shipping_min_items)} عدد و بیشتر!</span>
                {totalQty < shop.free_shipping_min_items && (
                  <span className="text-stone-500">
                    ({toPersianDigits(shop.free_shipping_min_items - totalQty)} عدد تا ارسال رایگان)
                  </span>
                )}
              </div>
            )}

            {/* Products List */}
            <div className="space-y-4">
              {shop.products.map((prod) => {
                const qty = cartQuantities[prod.id] || 0;
                const isAvailable = prod.available;

                return (
                  <div
                    key={prod.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      !isAvailable
                        ? 'bg-stone-100 border-stone-200 opacity-60'
                        : qty > 0
                        ? 'bg-white border-amber-500 shadow-sm ring-1 ring-amber-500'
                        : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                            {prod.title}
                          </h3>
                          {!isAvailable && (
                            <span className="px-2 py-0.5 bg-stone-300 text-stone-700 rounded text-[10px] font-bold">
                              ناموجود
                            </span>
                          )}
                        </div>

                        {prod.min_lead_days > 0 && (
                          <div className="text-[11px] text-amber-700 mt-1">
                            ⏱ زمان آماده‌سازی: حداقل {toPersianDigits(prod.min_lead_days)} روز کاری
                          </div>
                        )}

                        <div className="mt-1.5 text-xs font-bold text-stone-800">
                          {prod.pricing_mode === 'quote' ? (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                              قیمت بر اساس مشخصات (اعلام پس از ثبت)
                            </span>
                          ) : (
                            <span>{formatToman(prod.base_price)}</span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      {isAvailable && (
                        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prod.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white text-stone-800 hover:bg-stone-200 flex items-center justify-center font-bold shadow-2xs"
                            disabled={qty === 0}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-5 text-center font-bold text-xs font-mono">
                            {toPersianDigits(qty)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prod.id, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center font-bold shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Custom Template / Options when selected */}
                    {qty > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-stone-100 space-y-3">
                        {/* 1. Dress Template */}
                        {prod.template === 'dress' && (
                          <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                              <span>اندازه‌های شخصی (سانتی‌متر):</span>
                              {customerHint?.has_measurements && (
                                <button
                                  type="button"
                                  onClick={() => setUseSavedMeasurements(!useSavedMeasurements)}
                                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                                    useSavedMeasurements
                                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                                      : 'bg-white border-stone-300 text-stone-600'
                                  }`}
                                >
                                  {useSavedMeasurements ? '✓ همان اندازه‌های قبلی' : 'وارد کردن اندازه جدید'}
                                </button>
                              )}
                            </div>

                            {!useSavedMeasurements && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="block text-[11px] text-stone-600 mb-0.5">دور سینه:</label>
                                  <input
                                    type="number"
                                    placeholder="مثلاً ۹۰"
                                    value={productCustomFields[prod.id]?.chest || ''}
                                    onChange={(e) =>
                                      setProductCustomFields((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], chest: e.target.value },
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-left font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-stone-600 mb-0.5">دور کمر:</label>
                                  <input
                                    type="number"
                                    placeholder="مثلاً ۷۲"
                                    value={productCustomFields[prod.id]?.waist || ''}
                                    onChange={(e) =>
                                      setProductCustomFields((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], waist: e.target.value },
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-left font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-stone-600 mb-0.5">دور باسن:</label>
                                  <input
                                    type="number"
                                    placeholder="مثلاً ۹۶"
                                    value={productCustomFields[prod.id]?.hip || ''}
                                    onChange={(e) =>
                                      setProductCustomFields((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], hip: e.target.value },
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-left font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-stone-600 mb-0.5">قد کل:</label>
                                  <input
                                    type="number"
                                    placeholder="مثلاً ۱۶۵"
                                    value={productCustomFields[prod.id]?.height || ''}
                                    onChange={(e) =>
                                      setProductCustomFields((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], height: e.target.value },
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-left font-mono"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Painting Template (Size, Frame, Photo) */}
                        {prod.template === 'painting' && (
                          <div className="space-y-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                            <div>
                              <label className="block font-bold text-stone-800 mb-1">
                                انتخاب قاب محافظ: (اجباری)
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: 'بدون قاب', val: 'بدون قاب' },
                                  { label: 'با قاب چوبی (+۱۶۰٬۰۰۰)', val: 'با قاب چوبی' },
                                ].map((opt) => (
                                  <label
                                    key={opt.val}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                                      productCustomFields[prod.id]?.frame === opt.val
                                        ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                                        : 'bg-white border-stone-200 text-stone-700'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`frame_${prod.id}`}
                                      checked={productCustomFields[prod.id]?.frame === opt.val}
                                      onChange={() =>
                                        setProductCustomFields((prev) => ({
                                          ...prev,
                                          [prod.id]: { ...prev[prod.id], frame: opt.val },
                                        }))
                                      }
                                      className="accent-amber-600"
                                    />
                                    <span className="text-[11px]">{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Reference Photo Upload */}
                            <div>
                              <label className="block font-bold text-stone-800 mb-1">
                                آپلود عکس مرجع جهت نقاشی:
                              </label>
                              <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                                <Upload className="w-4 h-4 text-stone-500" />
                                <span className="text-xs text-stone-600">انتخاب عکس از گالری</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handlePhotoUpload(prod.id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>

                              {photoQualityWarning && (
                                <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] flex items-start gap-1.5">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <span>{photoQualityWarning}</span>
                                </div>
                              )}

                              {referencePhotos[prod.id]?.length > 0 && (
                                <div className="mt-2 flex gap-2">
                                  {referencePhotos[prod.id].map((ph, idx) => (
                                    <img
                                      key={idx}
                                      src={ph.data_b64}
                                      alt="مرجع"
                                      className="w-12 h-12 object-cover rounded-lg border border-stone-300"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3. Cake Template (Exact text & spellcheck checkbox) */}
                        {(prod.template === 'cake' || prod.template === 'name_necklace') && (
                          <div className="space-y-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                            <div>
                              <label className="block font-bold text-stone-800 mb-1">
                                متن دقیق نوشته روی کیک:
                              </label>
                              <input
                                type="text"
                                placeholder="مثال: تولدت مبارک کیان مهربون ❤️"
                                value={productCustomFields[prod.id]?.text || ''}
                                onChange={(e) =>
                                  setProductCustomFields((prev) => ({
                                    ...prev,
                                    [prod.id]: { ...prev[prod.id], text: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900"
                              />
                            </div>

                            {/* Large preview */}
                            {productCustomFields[prod.id]?.text && (
                              <div className="p-3 bg-amber-100/50 border border-amber-200 rounded-xl text-center">
                                <span className="text-[10px] text-amber-800 block mb-0.5 font-bold">
                                  پیش‌نمایش نوشته نهایی روی محصول:
                                </span>
                                <span className="text-sm font-black text-stone-900">
                                  « {productCustomFields[prod.id]?.text} »
                                </span>
                              </div>
                            )}

                            {/* Mandatory Spellcheck Checkbox */}
                            <label className="flex items-start gap-2 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={Boolean(spellcheckApproved[prod.id])}
                                onChange={(e) =>
                                  setSpellcheckApproved((prev) => ({
                                    ...prev,
                                    [prod.id]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                              />
                              <span className="text-[11px] font-bold text-stone-800 leading-snug">
                                املای نوشته را بررسی کردم و مسئولیت صحت آن با من است.
                              </span>
                            </label>
                          </div>
                        )}

                        {/* Generic Fields from product definition */}
                        {prod.fields && prod.fields.length > 0 && prod.template === null && (
                          <div className="space-y-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
                            {prod.fields.map((f) => (
                              <div key={f.key}>
                                <label className="block font-semibold text-stone-700 mb-1">
                                  {f.label}:
                                </label>
                                {f.options ? (
                                  <select
                                    value={productCustomFields[prod.id]?.[f.key] || ''}
                                    onChange={(e) =>
                                      setProductCustomFields((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], [f.key]: e.target.value },
                                      }))
                                    }
                                    className="w-full p-2 bg-white border rounded-lg"
                                  >
                                    <option value="">انتخاب کنید...</option>
                                    {f.options.map((opt) => (
                                      <option key={opt.label} value={opt.label}>
                                        {opt.label}{' '}
                                        {opt.price_delta > 0
                                          ? `(+${formatToman(opt.price_delta)})`
                                          : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={productCustomFields[prod.id]?.[f.key] || ''}
                                    onChange={(e) =>
                                      setProductCustomFields((prev) => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], [f.key]: e.target.value },
                                      }))
                                    }
                                    className="w-full p-2 bg-white border rounded-lg"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToAddress}
                disabled={totalQty === 0}
                className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <span>ادامه به آدرس ارسال ({toPersianDigits(totalQty)} محصول)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Shipping Address & Gift Option */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-center pt-1">
              <h2 className="text-base font-bold text-stone-900 mb-0.5">آدرس و مشخصات تحویل‌گیرنده</h2>
              <p className="text-xs text-stone-500">جهت ارسال سریع و دقیق مرسوله</p>
            </div>

            {addressError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {addressError}
              </div>
            )}

            {/* Returning customer saved address card */}
            {customerHint?.has_address && !isGift && (
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-stone-900 block">
                        آدرس پیش‌فرض شما (سفارش قبلی)
                      </span>
                      <span className="text-[10px] text-stone-500">
                        مشتری گرامی {customerHint.first_name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    مشتری وفادار
                  </span>
                </div>

                {/* Saved Address Preview */}
                <div className={`p-3.5 rounded-2xl transition-all border ${
                  useSavedAddress 
                    ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/30' 
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 mb-1">
                    <span>تحویل‌گیرنده: {customerHint.saved_address?.recipient_name || customerHint.first_name}</span>
                    <span className="text-stone-600 font-medium">شهر: {customerHint.saved_address?.city || customerHint.city}</span>
                  </div>
                  <div className="text-xs text-stone-700 leading-relaxed pt-0.5">
                    {customerHint.saved_address?.address || address || 'نشانی ذخیره‌شده در سیستم'}
                  </div>
                  {(customerHint.saved_address?.postal_code || postalCode) && (
                    <div className="text-[11px] text-stone-500 font-mono pt-1">
                      کد پستی: {toPersianDigits(customerHint.saved_address?.postal_code || postalCode)}
                    </div>
                  )}
                </div>

                {/* Apple/BluBank Segmented Choice */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setUseSavedAddress(true)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      useSavedAddress
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    <span>ارسال به همین آدرس</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSavedAddress(false)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      !useSavedAddress
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>ویرایش یا آدرس جدید</span>
                  </button>
                </div>
              </div>
            )}

            {/* Gift Switch - Modern iOS Toggle */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-stone-50 border border-amber-200/80 rounded-3xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-stone-900 block">
                    ارسال به عنوان هدیه 🎁
                  </span>
                  <span className="text-[10px] text-stone-500">
                    بسته بدون فاکتور قیمت و با احترام تحویل گیرنده داده می‌شود
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => {
                    setIsGift(e.target.checked);
                    if (e.target.checked) setUseSavedAddress(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Address Form: IMMEDIATELY VISIBLE for new customers, or when editing/gift */}
            {(!useSavedAddress || !customerHint?.has_address || isGift) && (
              <div className="space-y-3.5 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="text-xs font-bold text-stone-800">
                    {isGift ? 'مشخصات تحویل‌گیرنده هدیه:' : (customerHint?.has_address ? 'ثبت نشانی جدید:' : 'مشخصات پستی تحویل‌گیرنده:')}
                  </span>
                  {!customerHint?.has_address && (
                    <span className="text-[10px] text-stone-500">
                      جهت درج روی مرسوله پستی
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {isGift ? 'نام تحویل‌گیرنده هدیه:' : 'نام و نام خانوادگی تحویل‌گیرنده:'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="مثال: مریم احمدی"
                      className="w-full pl-3 pr-9 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                    <User className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
                  </div>
                </div>

                {isGift && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      شماره موبایل گیرنده هدیه (جهت هماهنگی پیک/پست):
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full pl-3 pr-9 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-xs sm:text-sm text-stone-900 font-mono text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
                        dir="ltr"
                      />
                      <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700">استان و شهر:</label>
                    <div className="flex gap-1 text-[10px]">
                      {['تهران', 'اصفهان', 'مشهد', 'شیراز', 'کرج'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCity(c)}
                          className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded text-[10px] transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="مثال: تهران / اصفهان / شیراز..."
                      className="w-full pl-3 pr-9 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                    <MapPin className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    نشانی دقیق پستی:
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="نام خیابان اصلی، کوچه، پلاک، واحد..."
                    className="w-full p-3 bg-stone-50 border border-stone-300 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-all leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    کد پستی ۱۰ رقمی (اختیاری اما تسریع‌کننده ارسال):
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="مثال: ۱۹۹۸۸۷۷۶۶۵"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-xs sm:text-sm text-stone-900 font-mono text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToPayment}
                className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <span>ادامه به بازبینی و پرداخت</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review, Card Info & Receipt Slip Upload */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-center pt-1">
              <h2 className="text-base font-bold text-stone-900 mb-0.5">بازبینی فاکتور و پرداخت</h2>
              <p className="text-xs text-stone-500">کارت‌به‌کارت و بارگذاری تصویر فیش واریز</p>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {submitError}
              </div>
            )}

            {/* Honeypot hidden input */}
            <input
              type="text"
              name="company_fax"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Order Invoice Breakdown */}
            <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
              <h3 className="font-bold text-stone-800 border-b pb-1.5">اقلام سفارش:</h3>
              {shop.products
                .filter((p) => (cartQuantities[p.id] || 0) > 0)
                .map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-stone-700 py-0.5">
                    <span>
                      {toPersianDigits(cartQuantities[p.id])} × {p.title}
                    </span>
                    <span className="font-mono font-semibold">
                      {p.pricing_mode === 'quote'
                        ? 'استعلام قیمت'
                        : formatToman(p.base_price * cartQuantities[p.id])}
                    </span>
                  </div>
                ))}

              <div className="border-t pt-2 space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>هزینه بسته‌بندی و ارسال:</span>
                  <span>{shippingCost === 0 ? 'رایگان 🎁' : formatToman(shippingCost)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-stone-900 pt-1 border-t">
                  <span>مبلغ کل سفارش:</span>
                  <span>{hasQuoteItem ? 'پس از بررسی اعلام می‌شود' : formatToman(totalAmount)}</span>
                </div>

                {!hasQuoteItem && shop.deposit_percent_default < 100 && (
                  <div className="flex justify-between text-amber-800 font-bold bg-amber-50 p-2 rounded-lg text-xs mt-1">
                    <span>مبلغ بیعانه جهت شروع کار ({toPersianDigits(shop.deposit_percent_default)}٪):</span>
                    <span>{formatToman(payableAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Information */}
            {!hasQuoteItem && (
              <div className="p-4 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl shadow-md space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span>اطلاعات کارت جهت واریز</span>
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>

                <div>
                  <div className="text-[11px] text-stone-400 mb-0.5">شماره کارت:</div>
                  <div className="flex items-center justify-between bg-stone-950/60 p-2.5 rounded-xl border border-stone-700">
                    <span className="font-mono text-base tracking-widest font-bold" dir="ltr">
                      {formatCardNumber(shop.card_number)}
                    </span>
                    <button
                      type="button"
                      onClick={copyCardNumber}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs"
                    >
                      {isCopiedCard ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedCard ? 'کپی شد' : 'کپی'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-stone-300">
                  <span className="text-stone-400">به نام: </span>
                  <span className="font-bold text-white">{shop.card_holder_name}</span>
                </div>
              </div>
            )}

            {/* Slip Upload & Claimed details */}
            {!hasQuoteItem ? (
              <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    تصویر فیش واریزی (اجباری):
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 bg-stone-50 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-xl cursor-pointer transition-colors">
                    <Upload className="w-6 h-6 text-stone-400 mb-1" />
                    <span className="text-xs font-semibold text-stone-700">
                      {receiptFile ? 'فیش انتخاب شد (برای تغییر کلیک کنید)' : 'بارگذاری تصویر فیش بانکی'}
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">فرمت JPG یا PNG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleReceiptUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {receiptFile && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <img
                          src={receiptFile.data_b64}
                          alt="فیش"
                          className="w-10 h-10 object-cover rounded-lg border cursor-pointer"
                          onClick={() => setZoomReceipt(true)}
                        />
                        <span className="text-xs font-bold text-emerald-800">
                          تصویر فیش دریافت شد
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setZoomReceipt(true)}
                        className="text-[11px] text-emerald-700 underline font-semibold"
                      >
                        مشاهده بزرگتر
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      مبلغ واریزشده (تومان):
                    </label>
                    <input
                      type="number"
                      value={claimedDeposit || ''}
                      onChange={(e) => setClaimedDeposit(Number(e.target.value))}
                      className="w-full p-2 bg-stone-50 border rounded-lg font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      ساعت واریز (اختیاری):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ۱۴:۲۵"
                      value={claimedTime}
                      onChange={(e) => setClaimedTime(e.target.value)}
                      className="w-full p-2 bg-stone-50 border rounded-lg text-left font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">سفارش شامل محصول سفارشی نیازمند قیمت‌گذاری است:</span>
                پس از ثبت نهایی، درخواست شما مستقیماً برای فروشنده ارسال می‌شود و پس از اعلام قیمت، از طریق همین سامانه می‌توانید مبلغ را واریز و فیش را بارگذاری کنید.
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || (!hasQuoteItem && !receiptFile)}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>در حال ثبت سفارش...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ثبت نهایی سفارش</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success & Tracking Link (PRD Section 8.6) */}
        {step === 5 && (
          <div className="space-y-5 text-center pt-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h2 className="text-lg font-black text-stone-900 mb-1">
                سفارش شما با موفقیت ثبت شد!
              </h2>
              <p className="text-xs text-stone-600">
                فروشگاه {shop.shop_name} در اسرع وقت فیش و جزئیات سفارش را بررسی می‌کند.
              </p>
            </div>

            {/* Short code badge */}
            <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200 max-w-xs mx-auto">
              <span className="text-[11px] text-stone-500 block mb-1">کد پیگیری اختصاصی:</span>
              <span className="font-mono text-2xl font-black text-amber-800 tracking-wider">
                {createdOrderShortCode}
              </span>
            </div>

            {/* Copy track link */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <p className="text-xs text-stone-700 leading-relaxed">
                می‌توانید وضعیت آماده‌سازی، بسته‌بندی و کد رهگیری پستی مرسوله خود را بدون نیاز به ورود در لینک زیر پیگیری کنید:
              </p>
              <button
                type="button"
                onClick={copyTrackLink}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  isCopiedTrackLink
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800'
                }`}
              >
                {isCopiedTrackLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopiedTrackLink ? 'لینک پیگیری کپی شد!' : 'کپی لینک صفحه پیگیری'}</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTrack(createdOrderId)}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <span>مشاهده صفحه زنده پیگیری سفارش</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Slip Zoom Modal */}
      {receiptFile && (
        <ImageModal
          isOpen={zoomReceipt}
          onClose={() => setZoomReceipt(false)}
          imageUrl={receiptFile.data_b64}
          title="تصویر فیش واریزی"
          subtitle={`مبلغ: ${formatToman(claimedDeposit)}`}
        />
      )}
    </div>
  );
};
