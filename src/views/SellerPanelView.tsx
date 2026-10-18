import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Hammer,
  Truck,
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  Plus,
  Send,
  UserCheck,
  Eye,
  FileText,
  Package,
  Layers,
  Settings,
  Users,
  ShoppingBag,
  LogOut,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  TrendingUp,
  Bell,
  BarChart3,
  Camera,
  Download,
  Upload,
  Trash2,
  Share2,
  Shield,
  Printer,
  ChevronDown,
} from 'lucide-react';
import {
  Seller,
  Order,
  OrderStatus,
  CarrierType,
  Product,
  Customer,
  Material,
} from '../types';
import { dataService } from '../services/dataService';
import {
  toPersianDigits,
  formatToman,
  normalizePhone,
  isValidPostTrackingCode,
  formatCardNumber,
} from '../utils/persianUtils';
import { formatToJalali, getDaysRemaining } from '../utils/dateUtils';
import { ImageModal } from '../components/ImageModal';
import { AddressLabelModal } from '../components/AddressLabelModal';
import { DirectMessageModal } from '../components/DirectMessageModal';
import { ManualOrderModal } from '../components/ManualOrderModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProfitCalculatorView } from '../components/ProfitCalculatorView';
import { RemindersView } from '../components/RemindersView';
import { AnalyticsDashboardView } from '../components/AnalyticsDashboardView';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

interface SellerPanelViewProps {
  sellerId: string;
  onLogout: () => void;
  onNavigateToShop: (handle: string) => void;
  onNavigateToSetup?: () => void;
}

export const SellerPanelView: React.FC<SellerPanelViewProps> = ({
  sellerId,
  onLogout,
  onNavigateToShop,
  onNavigateToSetup,
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'production' | 'shipping' | 'more'>('inbox');
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<Order | null>(null);
  const [directMsgData, setDirectMsgData] = useState<{ phone: string; text: string; title: string } | null>(null);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [isStoreSwitcherOpen, setIsStoreSwitcherOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scanningOrderId, setScanningOrderId] = useState<string | null>(null);

  // Tab 1 (Inbox) Action States
  const [inboxFilter, setInboxFilter] = useState<'all' | 'submitted' | 'quote' | 'needs_info'>('all');
  const [showDecisionGuide, setShowDecisionGuide] = useState(true);
  const [bankCheckedMap, setBankCheckedMap] = useState<Record<string, boolean>>({});
  const [quoteInputs, setQuoteInputs] = useState<Record<string, number>>({});
  const [quoteNotes, setQuoteNotes] = useState<Record<string, string>>({});
  const [needsInfoOrder, setNeedsInfoOrder] = useState<Order | null>(null);
  const [needsInfoText, setNeedsInfoText] = useState('');

  // Tab 3 (Shipping) Action States
  const [carrierInputs, setCarrierInputs] = useState<Record<string, CarrierType>>({});
  const [trackingCodeInputs, setTrackingCodeInputs] = useState<Record<string, string>>({});
  const [shippingErrorMap, setShippingErrorMap] = useState<Record<string, string>>({});

  // Tab 4 (More) Subviews
  const [moreSubView, setMoreSubView] = useState<'main' | 'products' | 'customers' | 'settings' | 'profit' | 'reminders' | 'analytics'>('main');
  const [customerSearch, setCustomerSearch] = useState('');

  // Load Data
  const loadSellerData = async () => {
    try {
      const s = await dataService.getSellerById(sellerId);
      setSeller(s);
      const ords = await dataService.listOrders(sellerId);
      setOrders(ords);
      const prods = await dataService.listProducts(sellerId);
      setProducts(prods);
      const custs = await dataService.listCustomers(sellerId);
      setCustomers(custs);
      const mats = await dataService.listMaterials(sellerId);
      setMaterials(mats);
    } catch (e) {
      console.error('Failed to load seller data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [sellerId]);

  // Tab 1: Confirm Slip
  const handleConfirmSlip = async (order: Order) => {
    if (!bankCheckedMap[order.orderId]) {
      showToast('لطفاً تیک «مبلغ را در حساب بانکی چک کردم» را علامت بزنید.', 'error');
      return;
    }
    try {
      await dataService.updateOrderStatus(order.orderId, 'confirmed', 'تأیید فیش توسط فروشنده');
      showToast('سفارش با موفقیت تأیید شد و به بخش آماده‌سازی منتقل گردید.', 'success');
      loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در تغییر وضعیت', 'error');
    }
  };

  // Tab 1: Submit Quote
  const handleSendQuote = async (orderId: string) => {
    const amount = quoteInputs[orderId];
    if (!amount || amount <= 0) {
      showToast('لطفاً مبلغ برآورد قیمت را وارد کنید', 'error');
      return;
    }
    try {
      const updated = await dataService.setOrderQuote(orderId, amount, quoteNotes[orderId]);
      const trackUrl = `${window.location.origin}${window.location.pathname}#/track/${updated.orderId}`;
      const msg = `قیمت سفارش شما در ${seller?.shop_name} ${formatToman(amount)} است. برای پرداخت بیعانه و نهایی‌سازی از این لینک استفاده کنید: ${trackUrl}`;
      setDirectMsgData({
        phone: updated.phone,
        text: msg,
        title: 'اعلام قیمت به مشتری',
      });
      showToast('برآورد قیمت با موفقیت ثبت شد.', 'success');
      loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در ثبت قیمت', 'error');
    }
  };

  // Tab 1: Needs Info
  const handleNeedsInfoSubmit = async () => {
    if (!needsInfoOrder || !needsInfoText.trim()) return;
    try {
      await dataService.updateOrderStatus(
        needsInfoOrder.orderId,
        'needs_info',
        needsInfoText.trim()
      );
      const trackUrl = `${window.location.origin}${window.location.pathname}#/track/${needsInfoOrder.orderId}`;
      const msg = `برای ادامهٔ سفارش در ${seller?.shop_name} به این مورد نیاز داریم: ${needsInfoText.trim()}. از این لینک پیگیری کنید: ${trackUrl}`;
      setDirectMsgData({
        phone: needsInfoOrder.phone,
        text: msg,
        title: 'ارسال پیام نقص اطلاعات به مشتری',
      });
      setNeedsInfoOrder(null);
      setNeedsInfoText('');
      showToast('وضعیت نقص اطلاعات ثبت و پیام آماده ارسال شد.', 'info');
      loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در ثبت وضعیت', 'error');
    }
  };

  // Tab 1: Cancel Order
  const handleCancelOrder = async (order: Order) => {
    setConfirmDialog({
      isOpen: true,
      title: 'لغو سفارش',
      message: `آیا از لغو سفارش #${order.short_code} اطمینان دارید؟`,
      confirmLabel: 'بله، لغو سفارش',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataService.updateOrderStatus(order.orderId, 'cancelled', 'لغو توسط فروشنده');
          showToast('سفارش لغو شد.', 'info');
          loadSellerData();
        } catch (e: any) {
          showToast(e.message || 'خطا در لغو سفارش', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Tab 4: Product CRUD
  const handleSaveProduct = async (product: Product) => {
    try {
      await dataService.saveProduct(sellerId, product);
      showToast('محصول با موفقیت ذخیره شد.', 'success');
      await loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در ذخیره محصول', 'error');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف محصول',
      message: 'آیا از حذف این محصول اطمینان دارید؟ این عملیات قابل بازگشت نیست.',
      confirmLabel: 'بله، حذف محصول',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataService.deleteProduct(sellerId, productId);
          showToast('محصول با موفقیت حذف شد.', 'success');
          await loadSellerData();
        } catch (e: any) {
          showToast(e.message || 'خطا در حذف محصول', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Tab 2: Production transitions
  const handleStartProduction = async (orderId: string) => {
    try {
      await dataService.updateOrderStatus(orderId, 'in_production', 'شروع آماده‌سازی در کارگاه');
      showToast('وضعیت سفارش به «در حال ساخت» تغییر یافت.', 'success');
      loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در تغییر وضعیت', 'error');
    }
  };

  const handleMarkPacked = async (orderId: string) => {
    try {
      await dataService.updateOrderStatus(orderId, 'packed', 'بسته‌بندی و آماده‌سازی مرسوله تکمیل شد');
      showToast('سفارش بسته‌بندی شد و به تب آماده ارسال منتقل شد.', 'success');
      loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در تغییر وضعیت', 'error');
    }
  };

  // Tab 3: Shipping
  const handleShipOrder = async (order: Order) => {
    const carrier = carrierInputs[order.orderId] || 'post';
    const trackingCode = trackingCodeInputs[order.orderId] || '';

    // Validation
    if (carrier === 'post') {
      if (!isValidPostTrackingCode(trackingCode)) {
        setShippingErrorMap((prev) => ({
          ...prev,
          [order.orderId]: 'کد رهگیری پست باید دقیقاً ۲۰ رقم عددی باشد.',
        }));
        return;
      }
    }

    setShippingErrorMap((prev) => ({ ...prev, [order.orderId]: '' }));

    try {
      const updated = await dataService.updateOrderStatus(
        order.orderId,
        'shipped',
        'مرسوله تحویل مأمور ارسال شد',
        carrier === 'courier' ? undefined : trackingCode,
        carrier
      );

      // Open Direct Message modal with pre-filled message (PRD Section 11)
      const trackUrl = `${window.location.origin}${window.location.pathname}#/track/${updated.orderId}`;
      let msg = '';
      if (carrier === 'post') {
        msg = `سفارش شما از ${seller?.shop_name} با پست ارسال شد. کد رهگیری ۲۰ رقمی: ${trackingCode}. پیگیری وضعیت مرسوله: ${trackUrl}`;
      } else if (carrier === 'courier') {
        msg = `سفارش شما از ${seller?.shop_name} تحویل پیک شد و امروز به دستتان می‌رسد. پیگیری: ${trackUrl}`;
      } else {
        msg = `سفارش شما از ${seller?.shop_name} ارسال شد. کد رهگیری: ${trackingCode}. پیگیری: ${trackUrl}`;
      }

      setDirectMsgData({
        phone: updated.phone,
        text: msg,
        title: 'ارسال مشخصات مرسوله به مشتری',
      });

      showToast('سفارش به وضعیت «ارسال‌شده» تغییر یافت.', 'success');
      loadSellerData();
    } catch (e: any) {
      showToast(e.message || 'خطا در ثبت ارسال', 'error');
    }
  };

  // Aggregated Production Calculation (PRD Section 9 Tab 2)
  const getAggregatedProductionItems = () => {
    const activeProdOrders = orders.filter(
      (o) => o.status === 'confirmed' || o.status === 'in_production'
    );
    const summary: Record<string, number> = {};
    for (const ord of activeProdOrders) {
      for (const it of ord.items) {
        summary[it.title] = (summary[it.title] || 0) + it.qty;
      }
    }
    return Object.entries(summary);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inboxOrders = orders.filter(
    (o) => o.status === 'submitted' || o.status === 'awaiting_quote' || o.status === 'needs_info'
  );

  const productionOrders = orders
    .filter((o) => o.status === 'confirmed' || o.status === 'in_production')
    .sort((a, b) => {
      // Sort soonest deadline first
      const tA = a.delivery_due_date ? new Date(a.delivery_due_date).getTime() : 9999999999999;
      const tB = b.delivery_due_date ? new Date(b.delivery_due_date).getTime() : 9999999999999;
      return tA - tB;
    });

  const packedOrders = orders.filter((o) => o.status === 'packed');

  const shopUrl = `${window.location.origin}${window.location.pathname}#/s/${seller?.handle}`;

  return (
    <div className="min-h-screen bg-stone-100 max-w-lg mx-auto shadow-xl border-x border-stone-200 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStoreSwitcherOpen(!isStoreSwitcherOpen)}
            className="flex items-center gap-2.5 text-right p-1 -m-1 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {seller?.shop_name.charAt(0) || 'ف'}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-xs sm:text-sm text-stone-900 leading-tight">
                  {seller?.shop_name}
                </h1>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-stone-500 font-mono" dir="ltr">
                  @{seller?.handle}
                </span>
                <span className="text-[9px] text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded font-bold">
                  تغییر / تعریف فروشگاه
                </span>
              </div>
            </div>
          </button>

          {/* Store Switcher Dropdown */}
          {isStoreSwitcherOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 p-2 text-xs animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-stone-100">
                <span className="font-bold text-stone-800 text-[11px]">انتخاب یا تعریف فروشگاه:</span>
                <button
                  type="button"
                  onClick={() => setIsStoreSwitcherOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-1 max-h-48 overflow-y-auto space-y-1">
                {dataService.getAllSellers().map((s) => (
                  <button
                    key={s.sellerId}
                    type="button"
                    onClick={() => {
                      dataService.setCurrentSellerId(s.sellerId);
                      setIsStoreSwitcherOpen(false);
                      window.location.hash = '#/panel';
                      window.location.reload();
                    }}
                    className={`w-full p-2 rounded-xl text-right flex items-center justify-between transition-colors ${
                      s.sellerId === sellerId
                        ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{s.shop_name}</div>
                      <div className="text-[10px] text-stone-400 font-mono" dir="ltr">@{s.handle}</div>
                    </div>
                    {s.sellerId === sellerId ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">فعال ✓</span>
                    ) : (
                      <span className="text-[10px] text-stone-400">انتخاب</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                {onNavigateToSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsStoreSwitcherOpen(false);
                      onNavigateToSetup();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ تعریف فروشگاه جدید (۱ دقیقه)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreSwitcherOpen(false);
                    onLogout();
                  }}
                  className="w-full py-1.5 text-stone-500 hover:text-stone-800 rounded-xl text-[11px] font-bold text-center"
                >
                  خروج به صفحه ورود
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Customer Form Link & Quick Manual Order */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNavigateToShop(seller?.handle || '')}
            className="p-2 sm:px-2.5 sm:py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
            title="مشاهده فرم از دید خریدار"
          >
            <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">فرم خریدار</span>
          </button>
          <button
            type="button"
            onClick={() => setIsManualOrderOpen(true)}
            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت دستی</span>
          </button>
        </div>
      </header>

      {/* Demo vs Production Status Bar */}
      {dataService.isDemoSeller(sellerId) ? (
        <div className="bg-amber-100/90 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-xs text-amber-950">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            <span>حالت نمایشی (داده‌های تستی PRD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'پاکسازی سفارش‌های آزمایشی',
                  message: 'آیا مایلید تمام سفارش‌های تستی پاک شوند تا با فروشگاه واقعی خودتان شروع به فروش کنید؟',
                  confirmLabel: 'بله، پاکسازی',
                  isDestructive: true,
                  onConfirm: async () => {
                    await dataService.clearSellerOrders(sellerId);
                    await loadSellerData();
                    showToast('سفارش‌های تستی پاک شدند! صف سفارشات خالی و آماده است.', 'success');
                    setConfirmDialog(null);
                  },
                });
              }}
              className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-50 rounded-lg text-[10px] font-bold text-amber-900 transition-colors"
            >
              پاکسازی دیتای تستی
            </button>
            {onNavigateToSetup && (
              <button
                type="button"
                onClick={onNavigateToSetup}
                className="px-2.5 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-[10px] font-bold transition-colors"
              >
                + ساخت فروشگاه من
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-900 font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>فروشگاه عملیاتی شما (آماده فروش زنده)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              dataService.downloadOrdersCSV(sellerId);
            }}
            className="text-emerald-800 hover:text-emerald-950 flex items-center gap-1 text-[10px]"
          >
            <Download className="w-3 h-3" />
            <span>دانلود اکسل سفارش‌ها</span>
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="p-3.5 flex-1 pb-24 overflow-y-auto space-y-4">
        {/* ================= TAB 1: INBOX & VERIFICATION ================= */}
        {activeTab === 'inbox' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Decision Guide for Seller */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-xs">
              <div
                className="flex items-center justify-between font-bold text-amber-900 cursor-pointer"
                onClick={() => setShowDecisionGuide(!showDecisionGuide)}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>راهنمای ۳ مرحله‌ای تأیید سفارش و تصمیم‌گیری فروشنده</span>
                </div>
                <span className="text-[11px] text-amber-800 underline font-semibold">
                  {showDecisionGuide ? 'بستن' : 'مشاهده راهنما'}
                </span>
              </div>

              {showDecisionGuide && (
                <div className="pt-1.5 space-y-1.5 text-[11px] text-stone-700 border-t border-amber-200/60 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-800 shrink-0">۱. بررسی اصالت فیش:</span>
                    <span>تصویر فیش را لمس کنید تا بزرگ شود؛ مبلغ و ساعت را با پیامک یا اپلیکیشن بانکی خود تطبیق دهید.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-800 shrink-0">۲. بررسی هشدارهای هوشمند:</span>
                    <span>به برچسب‌های 🔴 عکس کم‌کیفیت و 🟡 مغایرت مبلغ دقت فرمایید.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-800 shrink-0">۳. اقدام نهایی:</span>
                    <span>تیک «مبلغ را در بانک چک کردم» را بزنید و دکمه سبز را بفشارید تا سفارش به صف ساخت منتقل شود. در صورت کسری اطلاعات، دکمه «نیازمند اطلاعات» را بزنید تا پیام آماده دایرکت ایجاد شود.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: `همه ورودی‌ها (${toPersianDigits(inboxOrders.length)})` },
                {
                  id: 'submitted',
                  label: `در انتظار تأیید (${toPersianDigits(
                    inboxOrders.filter((o) => o.status === 'submitted').length
                  )})`,
                },
                {
                  id: 'quote',
                  label: `استعلام قیمت (${toPersianDigits(
                    inboxOrders.filter((o) => o.status === 'awaiting_quote').length
                  )})`,
                },
                {
                  id: 'needs_info',
                  label: `نیازمند اصلاح (${toPersianDigits(
                    inboxOrders.filter((o) => o.status === 'needs_info').length
                  )})`,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setInboxFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                    inboxFilter === f.id
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(() => {
              const displayOrders = inboxOrders.filter((o) => {
                if (inboxFilter === 'submitted') return o.status === 'submitted';
                if (inboxFilter === 'quote') return o.status === 'awaiting_quote';
                if (inboxFilter === 'needs_info') return o.status === 'needs_info';
                return true;
              });

              if (displayOrders.length === 0) {
                if (orders.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-xs animate-in fade-in">
                      <div className="text-center space-y-1">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-2xs">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm text-stone-900">فروشگاه شما آماده دریافت سفارش زنده است!</h3>
                        <p className="text-xs text-stone-500">
                          تمام تنظیمات کامل است. برای دریافت سفارش و ثبت فیش‌های خریداران از روش‌های زیر اقدام کنید:
                        </p>
                      </div>

                      {/* Store Dedicated Link */}
                      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                        <div className="text-xs font-bold text-stone-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Share2 className="w-4 h-4 text-amber-600" />
                            <span>لینک اختصاصی سفارش‌گیری شما:</span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">بدون تبلیغ</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-stone-200 font-mono text-[11px] text-stone-700 break-all select-all text-left" dir="ltr">
                          {shopUrl}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(shopUrl);
                              showToast('لینک فروشگاه کپی شد! آن را در بیو پیج اینستاگرام خود قرار دهید.', 'success');
                            }}
                            className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>کپی لینک برای بیو</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const quickReply = `سلام 🌸 برای انتخاب محصول و ثبت سفارش، این لینک اختصاصی را لمس کنید:\n${shopUrl}`;
                              navigator.clipboard.writeText(quickReply);
                              showToast('متن پاسخ سریع کپی شد! در تنظیمات دایرکت اینستاگرام ذخیره کنید.', 'success');
                            }}
                            className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5 text-amber-600" />
                            <span>کپی متن پاسخ سریع</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Manual Entry Option */}
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <div className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-amber-700" />
                          <span>مشتری هم‌اکنون در دایرکت پیام داده است؟</span>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-relaxed">
                          نیازی نیست منتظر بمانید! مشخصات سفارش و آدرس مشتری را مستقیماً با دکمه زیر دستی ثبت کنید تا به صف تولید و برچسب پستی برود:
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsManualOrderOpen(true)}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ ثبت سریع سفارش دستی</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h3 className="font-bold text-sm text-stone-800">سفارشی در این بخش وجود ندارد</h3>
                    <p className="text-xs text-stone-500">
                      همه فیش‌ها بررسی شده‌اند یا فیلتر دیگری را انتخاب کنید.
                    </p>
                  </div>
                );
              }

              return displayOrders.map((ord) => {
                const receiptFile = ord.files?.find((f) => f.kind === 'receipt');
                const isQuote = ord.status === 'awaiting_quote';
                const isNeedsInfo = ord.status === 'needs_info';
                const hasPriceMismatch = ord.flags.price_mismatch;
                const hasLowQualityPhoto = ord.flags.low_quality_photo;

                return (
                  <div
                    key={ord.orderId}
                    className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-stone-900">
                            {ord.customer_name}
                          </span>
                          <span className="text-xs text-stone-500 font-mono" dir="ltr">
                            ({toPersianDigits(ord.phone)})
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          کد: <span className="font-mono font-bold text-amber-800">{ord.short_code}</span> • تاریخ ثبت: {formatToJalali(ord.created_at)}
                        </div>
                      </div>

                      {/* Status & Warning Badges */}
                      <div className="flex flex-col items-end gap-1">
                        {isQuote && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold">
                            استعلام قیمت
                          </span>
                        )}
                        {hasLowQualityPhoto && (
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-600" />
                            عکس کم‌کیفیت
                          </span>
                        )}
                        {hasPriceMismatch && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            مغایرت مبلغ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="p-2.5 bg-stone-50 rounded-xl space-y-1 text-xs">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-stone-800">
                          <span>
                            {toPersianDigits(it.qty)} × {it.title}
                          </span>
                          <span className="font-semibold text-stone-700">
                            {it.unit_price > 0 ? formatToman(it.unit_price * it.qty) : 'استعلام'}
                          </span>
                        </div>
                      ))}

                      {/* Custom specs */}
                      {ord.items.map((it, idx) => {
                        if (!it.fields_values) return null;
                        return (
                          <div key={`spec_${idx}`} className="text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                            {Object.entries(it.fields_values).map(([k, v]) => (
                              <span key={k} className="ml-2">
                                • {k}: <b className="text-stone-700">{String(v)}</b>
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Receipt & Claimed Deposit */}
                    {!isQuote && (
                      <div className="flex items-center justify-between p-2.5 bg-stone-100 rounded-xl">
                        <div className="flex items-center gap-2">
                          {receiptFile ? (
                            <img
                              src={receiptFile.data_b64}
                              alt="فیش"
                              onClick={() => setImageModalUrl(receiptFile.data_b64)}
                              className="w-12 h-12 object-cover rounded-lg border border-stone-300 cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center text-[10px] text-stone-500 text-center p-1">
                              بدون فیش
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-stone-900">
                              مبلغ ادعاشده: {formatToman(ord.deposit_paid_claimed)}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              مبلغ سفارش: {formatToman(ord.total_amount)}
                              {ord.paid_at_claimed && ` • ساعت: ${ord.paid_at_claimed}`}
                            </div>
                          </div>
                        </div>

                        {receiptFile && (
                          <button
                            type="button"
                            onClick={() => setImageModalUrl(receiptFile.data_b64)}
                            className="text-[11px] text-amber-700 font-bold hover:underline"
                          >
                            زوم فیش
                          </button>
                        )}
                      </div>
                    )}

                    {/* Verification Actions for Submitted Orders */}
                    {!isQuote && (
                      <div className="space-y-2 pt-1">
                        {/* Mandatory bank check checkbox (PRD Section 2 & 9) */}
                        <label className="flex items-center gap-2 text-xs font-bold text-stone-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(bankCheckedMap[ord.orderId])}
                            onChange={(e) =>
                              setBankCheckedMap((prev) => ({
                                ...prev,
                                [ord.orderId]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                          />
                          <span>مبلغ را در حساب بانکی چک کردم و واریز شده است.</span>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmSlip(ord)}
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>تأیید فیش و شروع تولید</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNeedsInfoOrder(ord);
                              setNeedsInfoText('');
                            }}
                            className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 transition-colors"
                          >
                            نیازمند اطلاعات / پیام
                          </button>
                        </div>

                        <div className="pt-1 text-left">
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord)}
                            className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            لغو این سفارش
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quote Entry Action for Awaiting Quote */}
                    {isQuote && (
                      <div className="space-y-2 bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs">
                        <span className="font-bold text-purple-900 block">
                          اعلام قیمت برای کار سفارشی:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-stone-600 mb-0.5">مبلغ برآورد (تومان):</label>
                            <input
                              type="number"
                              placeholder="مثلاً ۷۵۰۰۰۰"
                              value={quoteInputs[ord.orderId] || ''}
                              onChange={(e) =>
                                setQuoteInputs((prev) => ({
                                  ...prev,
                                  [ord.orderId]: Number(e.target.value),
                                }))
                              }
                              className="w-full p-2 bg-white border rounded-lg font-mono text-left"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-stone-600 mb-0.5">یادداشت برای مشتری:</label>
                            <input
                              type="text"
                              placeholder="توضیح کوتاه..."
                              value={quoteNotes[ord.orderId] || ''}
                              onChange={(e) =>
                                setQuoteNotes((prev) => ({
                                  ...prev,
                                  [ord.orderId]: e.target.value,
                                }))
                              }
                              className="w-full p-2 bg-white border rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord)}
                            className="py-2 px-3 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 rounded-lg text-xs font-bold"
                          >
                            لغو
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendQuote(ord.orderId)}
                            className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>ارسال قیمت و ایجاد لینک پرداخت</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ================= TAB 2: PRODUCTION QUEUE ================= */}
        {activeTab === 'production' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Aggregated Production Summary View (PRD Section 9 Tab 2) */}
            <div className="p-4 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-200" />
                <h3 className="font-bold text-xs sm:text-sm">
                  نمای تجمیعی تولید کارگاه (در حال ساخت)
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {getAggregatedProductionItems().length === 0 ? (
                  <div className="text-xs text-amber-100 col-span-2">
                    در حال حاضر سفارشی در مرحله ساخت نیست.
                  </div>
                ) : (
                  getAggregatedProductionItems().map(([title, total]) => (
                    <div
                      key={title}
                      className="bg-black/20 p-2 rounded-xl text-xs flex justify-between items-center"
                    >
                      <span className="line-clamp-1 text-[11px]">{title}</span>
                      <span className="font-bold font-mono text-amber-200 mr-1 shrink-0">
                        {toPersianDigits(total)} عدد
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Weekly Capacity Bar (PRD Section 12 & 15) */}
            {(() => {
              const cap = seller?.weekly_capacity || 20;
              const activeCount = productionOrders.length;
              const capPercent = Math.min(100, Math.round((activeCount / cap) * 100));
              const isNearlyFull = capPercent >= 80;

              return (
                <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-800">
                      ظرفیت کارگاه در این هفته:
                    </span>
                    <span className="font-mono font-bold text-stone-900">
                      {toPersianDigits(activeCount)} از {toPersianDigits(cap)} سفارش ({toPersianDigits(capPercent)}٪)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNearlyFull ? 'bg-rose-500' : 'bg-amber-600'
                      }`}
                      style={{ width: `${capPercent}%` }}
                    />
                  </div>
                  {isNearlyFull && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded-lg font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>ظرفیت کارگاه رو به اتمام است؛ برای جلوگیری از تأخیر، سفارش‌های جاری را تکمیل فرمایید.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* List of Confirmed & In Production Orders */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-stone-700 px-1">
                سفارش‌های در نوبت آماده‌سازی ({toPersianDigits(productionOrders.length)})
              </h2>

              {productionOrders.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-stone-200 p-6 text-xs text-stone-500">
                  صف تولید خالی است.
                </div>
              ) : (
                productionOrders.map((ord) => {
                  const daysRem = getDaysRemaining(ord.delivery_due_date || ord.event_date);
                  const isUrgent = daysRem !== null && daysRem <= 3;

                  return (
                    <div
                      key={ord.orderId}
                      className={`p-4 bg-white rounded-2xl border shadow-xs space-y-3 ${
                        isUrgent ? 'border-rose-400 ring-1 ring-rose-300' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900">
                              {ord.ship_to.name}
                            </span>
                            <span className="font-mono text-xs text-stone-500">
                              #{ord.short_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            مقصد: {ord.ship_to.city} {ord.ship_to.is_gift && '🎁 (هدیه)'}
                          </div>
                        </div>

                        {/* Deadline badge */}
                        {ord.delivery_due_date && (
                          <div
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              مهلت: {formatToJalali(ord.delivery_due_date)}
                              {daysRem !== null && ` (${toPersianDigits(daysRem)} روز)`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Items & exact specifications */}
                      <div className="p-3 bg-stone-50 rounded-xl space-y-1.5 text-xs">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold text-stone-800">
                              <span>• {it.title}</span>
                              <span className="font-mono">× {toPersianDigits(it.qty)}</span>
                            </div>
                            {it.fields_values && (
                              <div className="text-[11px] text-stone-600 bg-white p-2 rounded-lg border border-stone-200 mt-1">
                                {Object.entries(it.fields_values).map(([k, v]) => (
                                  <div key={k}>
                                    <span className="font-semibold text-stone-700">{k}: </span>
                                    <span>{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForLabel(ord)}
                          className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-200 flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>کپی برچسب آدرس</span>
                        </button>

                        {ord.status === 'confirmed' ? (
                          <button
                            type="button"
                            onClick={() => handleStartProduction(ord.orderId)}
                            className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Hammer className="w-3.5 h-3.5" />
                            <span>شروع ساخت</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkPacked(ord.orderId)}
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>بسته‌بندی شد ✓</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: SHIPPING ================= */}
        {activeTab === 'shipping' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <h2 className="text-xs font-bold text-stone-700 px-1">
              سفارش‌های آماده ارسال ({toPersianDigits(packedOrders.length)})
            </h2>

            {packedOrders.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                <Truck className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="font-bold text-sm text-stone-800">هیچ سفارش آماده ارسالی نیست</h3>
                <p className="text-xs text-stone-500">
                  سفارش‌ها پس از بسته‌بندی در تب تولید، به این بخش منتقل می‌شوند.
                </p>
              </div>
            ) : (
              packedOrders.map((ord) => {
                const currentCarrier = carrierInputs[ord.orderId] || 'post';
                const currentTracking = trackingCodeInputs[ord.orderId] || '';
                const error = shippingErrorMap[ord.orderId];

                return (
                  <div
                    key={ord.orderId}
                    className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-stone-900">
                          {ord.ship_to.name}
                        </div>
                        <div className="text-xs text-stone-600 mt-0.5">
                          {ord.ship_to.city}، {ord.ship_to.address}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          تلفن: {toPersianDigits(ord.ship_to.phone)} • کد سفارش: {ord.short_code}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForLabel(ord)}
                        className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 text-xs font-bold"
                        title="برچسب آدرس"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Method Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-800">
                        روش ارسال:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        {[
                          { id: 'post', label: 'پست پیشتاز' },
                          { id: 'tipax', label: 'تیپاکس' },
                          { id: 'courier', label: 'پیک شهری' },
                          { id: 'other', label: 'سایر' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setCarrierInputs((prev) => ({
                                ...prev,
                                [ord.orderId]: m.id as CarrierType,
                              }))
                            }
                            className={`py-2 px-1 rounded-xl text-center text-xs font-bold border transition-all ${
                              currentCarrier === m.id
                                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                : 'bg-stone-50 text-stone-700 border-stone-200'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Carrier Inputs */}
                    {currentCarrier === 'post' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-stone-700">
                            کد رهگیری پست (۲۰ رقم):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setScanningOrderId(ord.orderId);
                              setIsBarcodeScannerOpen(true);
                            }}
                            className="text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-600" />
                            <span>اسکن با دوربین</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          dir="ltr"
                          value={currentTracking}
                          onChange={(e) =>
                            setTrackingCodeInputs((prev) => ({
                              ...prev,
                              [ord.orderId]: e.target.value,
                            }))
                          }
                          placeholder="مثال: 12345678901234567890"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-stone-900 text-left focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    {currentCarrier === 'tipax' || currentCarrier === 'other' ? (
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-stone-700">
                          شماره بارنامه / کد رهگیری:
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={currentTracking}
                          onChange={(e) =>
                            setTrackingCodeInputs((prev) => ({
                              ...prev,
                              [ord.orderId]: e.target.value,
                            }))
                          }
                          placeholder="کد پیگیری..."
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-stone-900 text-left focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    ) : null}

                    {currentCarrier === 'courier' && (
                      <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl text-xs flex items-center gap-2">
                        <span>🛵 تحویل پیک موتوری شهری می‌شود و کد پستی نیاز ندارد.</span>
                      </div>
                    )}

                    {error && (
                      <div className="text-xs text-rose-600 font-medium">{error}</div>
                    )}

                    {/* Ship Action */}
                    <button
                      type="button"
                      onClick={() => handleShipOrder(ord)}
                      className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>ثبت ارسال و نمایش پیامک/دایرکت مشتری</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= TAB 4: MORE & SETTINGS ================= */}
        {activeTab === 'more' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {moreSubView === 'main' && (
              <div className="space-y-3">
                {/* Shop Share Link Card */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
                  <span className="text-xs font-bold text-stone-800 block">
                    لینک ثبت سفارش مشتری در دایرکت:
                  </span>
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-xs text-stone-600 font-mono truncate max-w-[240px]" dir="ltr">
                      {shopUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shopUrl);
                        showToast('لینک فروشگاه کپی شد!', 'success');
                      }}
                      className="px-2.5 py-1 bg-stone-900 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی لینک</span>
                    </button>
                  </div>

                  {/* Ready Quick Reply Text */}
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold">متن آماده پاسخ سریع (Quick Reply):</div>
                    <p className="text-[11px] text-stone-700 leading-relaxed">
                      سلام 🌸 برای ثبت سفارش از این لینک استفاده کنید: {shopUrl}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`سلام 🌸 برای ثبت سفارش از این لینک استفاده کنید: ${shopUrl}`);
                        showToast('متن پاسخ سریع کپی شد!', 'success');
                      }}
                      className="text-[11px] text-amber-800 underline font-bold mt-1 block"
                    >
                      کپی متن آماده برای اینستاگرام
                    </button>
                  </div>
                </div>

                {/* Navigation items */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMoreSubView('products')}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">مدیریت محصولات</div>
                        <div className="text-[11px] text-stone-500">
                          {toPersianDigits(products.length)} محصول تعریف‌شده
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMoreSubView('customers')}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">مشتریان و اندازه‌ها</div>
                        <div className="text-[11px] text-stone-500">
                          {toPersianDigits(customers.length)} مشتری ثبت‌شده در حافظه
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMoreSubView('profit')}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          ماشین‌حساب سود و بهای تمام‌شده («چراغ سود»)
                        </div>
                        <div className="text-[11px] text-stone-500">
                          محاسبه هزینه مواد و جلوگیری از فروش زیان‌ده
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMoreSubView('reminders')}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          یادآورهای بازخرید و مناسبت‌ها
                        </div>
                        <div className="text-[11px] text-stone-500">
                          بازگرداندن مشتریان قبلی با پیام‌های اختصاصی
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMoreSubView('analytics')}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          داشبورد آمار و قیف تبدیل
                        </div>
                        <div className="text-[11px] text-stone-500">
                          ردیابی بازدید فرم، نرخ تبدیل و کاهش پیام‌ها
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMoreSubView('settings')}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">تنظیمات کارت و ارسال</div>
                        <div className="text-[11px] text-stone-500">
                          شماره کارت، هزینه ارسال، توقف سفارش
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 rotate-180" />
                  </button>
                </div>

                {/* Production Data Tools, Excel Export & Backup */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-stone-900">خروجی اکسل و مدیریت داده‌های عملیاتی:</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    این نرم‌افزار به‌صورت ۱۰۰٪ قطعی کار می‌کند؛ برای ارائه لیست به باجه پست، پیک موتوری، یا سیستم حسابداری از خروجی اکسل استفاده فرمایید:
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {/* CSV Export */}
                    <button
                      type="button"
                      onClick={() => dataService.downloadOrdersCSV(sellerId)}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود فایل اکسل سفارش‌ها (CSV سازگار با فارسی)</span>
                    </button>

                    {/* JSON Full Backup & Restore */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const backup = dataService.exportFullBackupJSON();
                          const blob = new Blob([backup], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `sefareshyar_backup_${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200"
                      >
                        <Download className="w-3.5 h-3.5 text-stone-600" />
                        <span>دانلود پشتیبان (JSON)</span>
                      </button>

                      <label className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-stone-600" />
                        <span>بازیابی فایل پشتیبان</span>
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async (evt) => {
                              const text = evt.target?.result as string;
                              const ok = await dataService.importFullBackupJSON(text);
                              if (ok) {
                                showToast('اطلاعات با موفقیت بازیابی شد!', 'success');
                                setTimeout(() => window.location.reload(), 1000);
                              } else {
                                showToast('خطا: فرمت فایل پشتیبان معتبر نیست.', 'error');
                              }
                            };
                            reader.readAsText(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Clear Test Orders */}
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'پاکسازی سفارش‌های فروشگاه',
                          message: `آیا مطمئنید می‌خواهید تمام سفارش‌های فروشگاه «${seller?.shop_name}» پاک شوند و با صف خالی واقعی شروع به کار کنید؟`,
                          confirmLabel: 'بله، پاکسازی کامل',
                          isDestructive: true,
                          onConfirm: async () => {
                            await dataService.clearSellerOrders(sellerId);
                            await loadSellerData();
                            showToast('سفارش‌های تستی پاک شدند! فروشگاه شما اکنون با صف خالی آماده دریافت سفارشات زنده است.', 'success');
                            setConfirmDialog(null);
                          },
                        });
                      }}
                      className="w-full py-2.5 bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 hover:border-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>پاکسازی سفارش‌های تستی این فروشگاه (شروع واقعی)</span>
                    </button>
                  </div>
                </div>

                {/* Multi-Store Switcher & New Shop Wizard */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-stone-800">فروشگاه‌های ثبت‌شده در این دستگاه:</div>
                    {onNavigateToSetup && (
                      <button
                        type="button"
                        onClick={onNavigateToSetup}
                        className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg hover:bg-amber-100 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>فروشگاه جدید</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {dataService.getAllSellers().map((s) => (
                      <button
                        key={s.sellerId}
                        type="button"
                        onClick={() => {
                          if (s.sellerId !== sellerId) {
                            dataService.setCurrentSellerId(s.sellerId);
                            window.location.reload();
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs transition-colors border ${
                          s.sellerId === sellerId
                            ? 'bg-amber-50 border-amber-300 font-bold text-amber-900'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div>
                          <span>{s.shop_name}</span>
                          <span className="text-[10px] text-stone-500 font-mono mr-1.5" dir="ltr">
                            (@{s.handle})
                          </span>
                        </div>
                        {s.sellerId === sellerId ? (
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-200/60 px-1.5 py-0.5 rounded">
                            در حال مدیریت
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500">انتخاب ←</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'بازنشانی به نمونه‌های اولیه',
                        message: 'آیا مایلید داده‌ها به نمونه‌های اولیه PRD بازنشانی شوند؟',
                        confirmLabel: 'بله، بازنشانی',
                        isDestructive: false,
                        onConfirm: async () => {
                          await dataService.resetToDemoData();
                          window.location.reload();
                        },
                      });
                    }}
                    className="w-full py-2 bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-200 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>بازنشانی به داده‌های اولیه آزمایشی</span>
                  </button>
                </div>

                {/* Logout */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج از پنل</span>
                </button>
              </div>
            )}

            {/* SubView: Profit Calculator */}
            {moreSubView === 'profit' && (
              <ProfitCalculatorView
                products={products}
                materials={materials}
                onBack={() => setMoreSubView('main')}
                onSaveMaterial={async (m) => {
                  await dataService.saveMaterial(sellerId, m);
                  loadSellerData();
                }}
                onSaveProduct={async (p) => {
                  await dataService.saveProduct(sellerId, p);
                  loadSellerData();
                }}
              />
            )}

            {/* SubView: Reminders */}
            {moreSubView === 'reminders' && (
              <RemindersView
                seller={seller}
                customers={customers}
                onBack={() => setMoreSubView('main')}
              />
            )}

            {/* SubView: Analytics */}
            {moreSubView === 'analytics' && (
              <AnalyticsDashboardView
                seller={seller}
                orders={orders}
                onBack={() => setMoreSubView('main')}
              />
            )}

            {/* SubView: Products */}
            {moreSubView === 'products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMoreSubView('main')}
                    className="text-xs text-stone-600 font-bold flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>بازگشت</span>
                  </button>
                  <h3 className="text-xs font-bold text-stone-900">محصولات فروشگاه</h3>
                </div>

                {/* Add new product button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductToEdit(null);
                    setIsProductModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ افزودن محصول جدید به فروشگاه</span>
                </button>

                <div className="space-y-2.5">
                  {products.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200">
                      هنوز محصولی ثبت نشده است. از دکمه بالا برای افزودن اولین محصول استفاده کنید.
                    </div>
                  ) : (
                    products.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between"
                      >
                        <div className="flex-1 pl-2">
                          <div className="font-bold text-xs text-stone-900">{p.title}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {p.pricing_mode === 'quote'
                              ? 'استعلام قیمت (سفارشی)'
                              : formatToman(p.base_price)}
                            {p.template && ` • قالب: ${p.template}`}
                            {p.min_lead_days > 0 && ` • آماده‌سازی: ${toPersianDigits(p.min_lead_days)} روز`}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = { ...p, available: !p.available };
                              await dataService.saveProduct(sellerId, updated);
                              loadSellerData();
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                              p.available
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}
                          >
                            {p.available ? 'موجود' : 'ناموجود'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductToEdit(p);
                              setIsProductModalOpen(true);
                            }}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold"
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-1.5 py-1 text-stone-400 hover:text-rose-600 rounded-lg text-[11px]"
                            title="حذف محصول"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SubView: Customers */}
            {moreSubView === 'customers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMoreSubView('main')}
                    className="text-xs text-stone-600 font-bold flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>بازگشت</span>
                  </button>
                  <h3 className="text-xs font-bold text-stone-900">بانک مشتریان</h3>
                </div>

                <input
                  type="text"
                  placeholder="جستجو بر اساس نام یا شماره..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs"
                />

                <div className="space-y-2.5">
                  {customers
                    .filter(
                      (c) =>
                        c.full_name.includes(customerSearch) ||
                        c.phone.includes(customerSearch)
                    )
                    .map((c) => (
                      <div
                        key={c.customerId}
                        className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-stone-900">{c.full_name}</span>
                          <span className="text-[11px] font-mono text-stone-600" dir="ltr">
                            {toPersianDigits(c.phone)}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          تعداد خریدها: <b className="text-stone-800">{toPersianDigits(c.orders_count)}</b> • شهر: {c.default_address?.city || 'نامشخص'}
                        </div>
                        {c.saved_measurements && (
                          <div className="text-[10px] bg-stone-50 p-1.5 rounded-lg text-stone-600">
                            اندازه‌ها: سینه {toPersianDigits(c.saved_measurements.chest || '')}، کمر {toPersianDigits(c.saved_measurements.waist || '')}، باسن {toPersianDigits(c.saved_measurements.hip || '')}، قد {toPersianDigits(c.saved_measurements.height || '')}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SubView: Settings */}
            {moreSubView === 'settings' && seller && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMoreSubView('main')}
                    className="text-xs text-stone-600 font-bold flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>بازگشت</span>
                  </button>
                  <h3 className="text-xs font-bold text-stone-900">تنظیمات فروشگاه</h3>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  {/* Accepting orders toggle (PRD Section 8.1) */}
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <span className="font-bold text-stone-900 block">پذیرش سفارش جدید:</span>
                      <span className="text-[11px] text-stone-500">
                        {seller.is_accepting_orders ? 'فرم برای مشتریان باز است' : 'فرم بسته و غیرفعال است'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = {
                          ...seller,
                          is_accepting_orders: !seller.is_accepting_orders,
                        };
                        await dataService.saveSeller(updated);
                        setSeller(updated);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs ${
                        seller.is_accepting_orders
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {seller.is_accepting_orders ? 'فعال' : 'متوقف'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">شماره کارت ۱۶ رقمی:</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={seller.card_number}
                      onChange={(e) => setSeller({ ...seller, card_number: e.target.value })}
                      className="w-full p-2 bg-stone-50 border rounded-lg font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">نام دارنده حساب:</label>
                    <input
                      type="text"
                      value={seller.card_holder_name}
                      onChange={(e) => setSeller({ ...seller, card_holder_name: e.target.value })}
                      className="w-full p-2 bg-stone-50 border rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">هزینه ارسال پیش‌فرض:</label>
                      <input
                        type="number"
                        value={seller.shipping_default_cost}
                        onChange={(e) =>
                          setSeller({ ...seller, shipping_default_cost: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-stone-50 border rounded-lg font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">حداقل تعداد ارسال رایگان:</label>
                      <input
                        type="number"
                        value={seller.free_shipping_min_items}
                        onChange={(e) =>
                          setSeller({ ...seller, free_shipping_min_items: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-stone-50 border rounded-lg font-mono text-left"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await dataService.saveSeller(seller);
                      showToast('تنظیمات فروشگاه با موفقیت ذخیره شد!', 'success');
                      setMoreSubView('main');
                    }}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors active:scale-[0.98]"
                  >
                    ذخیره تغییرات
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= 4-TAB BOTTOM NAVIGATION BAR ================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 px-2 py-1 shadow-lg">
        <div className="grid grid-cols-4 gap-1">
          {/* Tab 1: Inbox */}
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
              activeTab === 'inbox' ? 'text-amber-800 font-black' : 'text-stone-500 font-normal hover:text-stone-900'
            }`}
          >
            <div className="relative">
              <Inbox className="w-5 h-5" />
              {inboxOrders.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-600 text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {toPersianDigits(inboxOrders.length)}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">ورودی و تأیید</span>
          </button>

          {/* Tab 2: Production */}
          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
              activeTab === 'production' ? 'text-amber-800 font-black' : 'text-stone-500 font-normal hover:text-stone-900'
            }`}
          >
            <div className="relative">
              <Hammer className="w-5 h-5" />
              {productionOrders.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-stone-700 text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {toPersianDigits(productionOrders.length)}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">صف ساخت</span>
          </button>

          {/* Tab 3: Shipping */}
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
              activeTab === 'shipping' ? 'text-amber-800 font-black' : 'text-stone-500 font-normal hover:text-stone-900'
            }`}
          >
            <div className="relative">
              <Truck className="w-5 h-5" />
              {packedOrders.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {toPersianDigits(packedOrders.length)}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">ارسال</span>
          </button>

          {/* Tab 4: More */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('more');
              setMoreSubView('main');
            }}
            className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'more' ? 'text-amber-800 font-black' : 'text-stone-500 font-normal hover:text-stone-900'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px] mt-1">بیشتر</span>
          </button>
        </div>
      </nav>

      {/* Image Zoom Modal */}
      {imageModalUrl && (
        <ImageModal
          isOpen={Boolean(imageModalUrl)}
          onClose={() => setImageModalUrl(null)}
          imageUrl={imageModalUrl}
          title="مشاهده فیش واریز"
        />
      )}

      {/* Address Label Modal */}
      {selectedOrderForLabel && (
        <AddressLabelModal
          isOpen={Boolean(selectedOrderForLabel)}
          onClose={() => setSelectedOrderForLabel(null)}
          order={selectedOrderForLabel}
          seller={seller}
        />
      )}

      {/* Direct Message / SMS Modal */}
      {directMsgData && (
        <DirectMessageModal
          isOpen={Boolean(directMsgData)}
          onClose={() => setDirectMsgData(null)}
          phone={directMsgData.phone}
          messageText={directMsgData.text}
          title={directMsgData.title}
        />
      )}

      {/* Needs Info Prompt Modal */}
      {needsInfoOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-xs text-stone-900">چه موردی از سفارش ناقص است؟</h3>
            <textarea
              rows={3}
              value={needsInfoText}
              onChange={(e) => setNeedsInfoText(e.target.value)}
              placeholder="مثلاً: اندازه دور کمر یا رنگ مدنظر را مشخص نکرده‌اید..."
              className="w-full p-2.5 bg-stone-50 border rounded-xl text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNeedsInfoOrder(null)}
                className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleNeedsInfoSubmit}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold"
              >
                ثبت و کپی پیام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Quick Order Modal */}
      <ManualOrderModal
        isOpen={isManualOrderOpen}
        onClose={() => setIsManualOrderOpen(false)}
        sellerId={sellerId}
        products={products}
        onOrderCreated={() => {
          loadSellerData();
          showToast('سفارش دستی با موفقیت ثبت گردید.', 'success');
        }}
      />

      {/* Product Create / Edit Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProductToEdit(null);
        }}
        onSave={handleSaveProduct}
        productToEdit={selectedProductToEdit}
      />

      {/* Barcode Scanner Modal (P2) */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={(code) => {
          if (scanningOrderId) {
            setTrackingCodeInputs((prev) => ({
              ...prev,
              [scanningOrderId]: code,
            }));
          }
        }}
      />

      {/* Modern Confirm Modal */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
