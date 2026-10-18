import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CreditCard,
  Upload,
  ArrowRight,
  Store,
} from 'lucide-react';
import { PublicStatus, OrderFile } from '../types';
import { dataService } from '../services/dataService';
import {
  toPersianDigits,
  formatToman,
  formatCardNumber,
  isValidPostTrackingCode,
} from '../utils/persianUtils';
import { processAndCompressImage } from '../utils/imageUtils';

interface TrackingViewProps {
  token?: string;
  onNavigateHome: () => void;
  onNavigateToShop: (handle?: string) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  token,
  onNavigateHome,
  onNavigateToShop,
}) => {
  const [searchInput, setSearchInput] = useState(token || '');
  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Quote payment fulfillment state
  const [quoteReceipt, setQuoteReceipt] = useState<OrderFile | null>(null);
  const [isSubmittingQuotePay, setIsSubmittingQuotePay] = useState(false);
  const [quotePaySuccess, setQuotePaySuccess] = useState(false);

  const fetchStatus = async (idOrCode: string) => {
    if (!idOrCode.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await dataService.getPublicStatus(idOrCode.trim());
      if (res) {
        setPublicStatus(res);
        await dataService.logEvent(res.seller_id, 'status_page_viewed', { orderId: res.order_id });
      } else {
        setPublicStatus(null);
        setErrorMsg('سفارشی با این کد پیگیری پیدا نشد. لطفاً کد را بررسی کنید.');
      }
    } catch {
      setErrorMsg('خطا در دریافت وضعیت سفارش');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      setSearchInput(token);
      fetchStatus(token);
    }
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(searchInput);
  };

  const handleQuoteReceiptUpload = async (file: File) => {
    try {
      const res = await processAndCompressImage(file, 1200, 0.7);
      setQuoteReceipt({
        kind: 'receipt',
        data_b64: res.dataUrl,
        width: res.width,
        height: res.height,
        bytes: res.compressedBytes,
      });
    } catch (e: any) {
      alert(e.message || 'خطا در بارگذاری فیش');
    }
  };

  const submitQuoteSlip = async () => {
    if (!publicStatus || !quoteReceipt) return;
    setIsSubmittingQuotePay(true);
    try {
      const deposit = publicStatus.deposit_required || publicStatus.quote_amount || 0;
      await dataService.submitQuotePayment(publicStatus.order_id, deposit, quoteReceipt);
      setQuotePaySuccess(true);
      fetchStatus(publicStatus.order_id);
    } catch (err: any) {
      alert(err.message || 'خطا در ارسال فیش');
    } finally {
      setIsSubmittingQuotePay(false);
    }
  };

  const copyTrackingBarcode = () => {
    if (!publicStatus?.tracking_code) return;
    navigator.clipboard.writeText(publicStatus.tracking_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Determine active step index (0 to 3) for the 4-stage tracking bar
  const getStageIndex = (status?: string): number => {
    switch (status) {
      case 'submitted':
        return 0; // فیش در انتظار بررسی
      case 'confirmed':
      case 'in_production':
        return 1; // تأیید شد و در حال آماده‌سازی
      case 'packed':
        return 2; // بسته‌بندی شد
      case 'shipped':
        return 3; // ارسال شد
      default:
        return 0;
    }
  };

  const stageIndex = getStageIndex(publicStatus?.status);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 max-w-md mx-auto shadow-md border-x border-stone-200 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="font-bold text-sm text-stone-900">پیگیری وضعیت سفارش</h1>
            <p className="text-[11px] text-stone-500">
              {publicStatus?.shop_name ? `سفارش در ${publicStatus.shop_name}` : 'سامانه استعلام مرسوله'}
            </p>
          </div>
        </div>
        {publicStatus?.seller_id && (
          <div className="text-[11px] text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded-md">
            #{publicStatus.short_code}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="p-4 flex-1 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="کد ۵ رقمی یا شناسه سفارش..."
              className="w-full px-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-stone-800 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>جستجو</span>
          </button>
        </form>

        {loading && (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-stone-500">در حال دریافت آخرین وضعیت سفارش...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {publicStatus && !loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Status Card Header */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div>
                  <span className="text-[11px] text-stone-500 block">فروشگاه:</span>
                  <span className="font-bold text-sm text-stone-900">{publicStatus.shop_name}</span>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-stone-500 block">کد سفارش:</span>
                  <span className="font-mono text-base font-black text-amber-800">
                    {publicStatus.short_code}
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-700 leading-relaxed">
                <span className="font-bold text-stone-900">اقلام سفارش: </span>
                {publicStatus.items_summary}
              </div>

              {publicStatus.total_amount ? (
                <div className="flex justify-between items-center text-xs font-bold text-stone-800 pt-1">
                  <span>مبلغ کل سفارش:</span>
                  <span className="text-stone-900">{formatToman(publicStatus.total_amount)}</span>
                </div>
              ) : null}
            </div>

            {/* Special States */}
            {/* 1. Awaiting Quote State */}
            {publicStatus.status === 'awaiting_quote' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>در انتظار اعلام قیمت از طرف فروشگاه</span>
                </div>
                <p className="leading-relaxed">
                  درخواست ساخت سفارشی شما ثبت شده است. فروشنده {publicStatus.shop_name} مشخصات و طرح را بررسی کرده و مبلغ نهایی و بیعانه را به زودی در همین صفحه اعلام می‌کند.
                </p>
              </div>
            )}

            {/* 2. Quote Sent State (Customer can now pay and upload slip!) */}
            {publicStatus.status === 'quote_sent' && (
              <div className="p-4 bg-white border border-amber-300 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs border-b pb-2">
                  <span className="font-bold text-stone-900">قیمت نهایی اعلام شد:</span>
                  <span className="font-black text-amber-800 text-sm">
                    {formatToman(publicStatus.quote_amount)}
                  </span>
                </div>

                <div className="p-3 bg-stone-100 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-stone-800">
                    <span>مبلغ بیعانه جهت شروع سفارش:</span>
                    <span className="text-amber-800">{formatToman(publicStatus.deposit_required)}</span>
                  </div>
                  {publicStatus.card_number && (
                    <div className="pt-2 border-t text-[11px] text-stone-600">
                      <div>شماره کارت جهت واریز:</div>
                      <div className="font-mono text-sm font-bold text-stone-900 mt-0.5" dir="ltr">
                        {formatCardNumber(publicStatus.card_number)}
                      </div>
                      <div className="mt-0.5">به نام: {publicStatus.card_holder_name}</div>
                    </div>
                  )}
                </div>

                {/* Upload Slip for Quote */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    بارگذاری فیش واریز بیعانه:
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-100">
                    <Upload className="w-4 h-4 text-stone-500" />
                    <span className="text-xs text-stone-600">
                      {quoteReceipt ? 'فیش انتخاب شد' : 'انتخاب عکس فیش'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleQuoteReceiptUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {quoteReceipt && (
                    <button
                      type="button"
                      onClick={submitQuoteSlip}
                      disabled={isSubmittingQuotePay}
                      className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      {isSubmittingQuotePay ? 'در حال ارسال...' : 'ارسال فیش و شروع آماده‌سازی'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. Needs Info State */}
            {publicStatus.status === 'needs_info' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>نیازمند تکمیل اطلاعات یا اصلاح</span>
                </div>
                <p className="leading-relaxed">
                  پیام فروشگاه: {publicStatus.needs_info_reason || 'لطفاً جهت هماهنگی اطلاعات تکمیلی با دایرکت پیج در ارتباط باشید.'}
                </p>
              </div>
            )}

            {/* 4-Stage Interactive Timeline (PRD Section 8.6) */}
            {publicStatus.status !== 'awaiting_quote' && publicStatus.status !== 'quote_sent' && (
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="font-bold text-xs text-stone-800">مراحل آماده‌سازی و ارسال:</h3>

                <div className="relative pr-5 border-r-2 border-stone-200 space-y-6">
                  {/* Step 1: Receipt check */}
                  <div className="relative">
                    <div
                      className={`absolute -right-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stageIndex >= 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {stageIndex > 0 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '۱'}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-stone-900">فیش در انتظار تأیید</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {stageIndex > 0 ? 'فیش واریزی بررسی و تأیید شد' : 'در نوبت بررسی واریزی بانکی توسط فروشنده'}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Confirmed & In Production */}
                  <div className="relative">
                    <div
                      className={`absolute -right-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stageIndex >= 1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {stageIndex > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '۲'}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-stone-900">تأیید شد و در صف ساخت</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        سفارش در کارگاه در حال آماده‌سازی و ساخت است
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Packed */}
                  <div className="relative">
                    <div
                      className={`absolute -right-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stageIndex >= 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {stageIndex > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '۳'}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-stone-900">بسته‌بندی شد</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        بسته با ضربه‌گیر آماده تحویل به اداره پست یا پیک شد
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Shipped */}
                  <div className="relative">
                    <div
                      className={`absolute -right-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stageIndex >= 3
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {stageIndex >= 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '۴'}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-stone-900">ارسال شد</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        مرسوله تحویل مأمور ارسال گردید
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Details Box (If Shipped) */}
                {publicStatus.status === 'shipped' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <Truck className="w-4 h-4" />
                      <span>اطلاعات ارسال مرسوله:</span>
                    </div>

                    {publicStatus.carrier === 'courier' ? (
                      <div className="text-xs text-stone-700 bg-white p-2.5 rounded-lg border border-emerald-100">
                        🛵 <span className="font-bold">تحویل پیک شد:</span> سفارش با پیک موتوری ارسال شده و امروز به مقصد می‌رسد.
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div>
                            <span className="text-[10px] text-stone-500 block">کد رهگیری پستی:</span>
                            <span className="font-mono text-sm font-bold text-stone-900" dir="ltr">
                              {publicStatus.tracking_code}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={copyTrackingBarcode}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-md flex items-center gap-1"
                          >
                            {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode ? 'کپی شد' : 'کپی'}</span>
                          </button>
                        </div>

                        {publicStatus.tracking_url && (
                          <a
                            href={publicStatus.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <span>رهگیری مستقیم در سامانه اداره پست</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
