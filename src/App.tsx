import React, { useState, useEffect } from 'react';
import { CustomerFormView } from './views/CustomerFormView';
import { TrackingView } from './views/TrackingView';
import { SellerPanelView } from './views/SellerPanelView';
import { LoginView } from './views/LoginView';
import { SellerSetupView } from './views/SellerSetupView';
import { dataService } from './services/dataService';
import { Seller } from './types';
import {
  Store,
  Layers,
  WifiOff,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Trash2,
  Package,
} from 'lucide-react';
import { ToastProvider, useToast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';

function MainApp() {
  const { showToast } = useToast();
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#/');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentSellerId, setCurrentSellerId] = useState<string>(dataService.getCurrentSellerId());
  const [activeSeller, setActiveSeller] = useState<Seller | null>(null);
  const [customSellers, setCustomSellers] = useState<Seller[]>([]);
  const [demoSellers, setDemoSellers] = useState<Seller[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Sync sellers
  const syncSellersState = async () => {
    const sId = dataService.getCurrentSellerId();
    setCurrentSellerId(sId);
    if (sId) {
      const s = await dataService.getSellerById(sId);
      setActiveSeller(s);
    } else {
      setActiveSeller(null);
    }
    const all = dataService.getAllSellers();
    setCustomSellers(all.filter((s) => !dataService.isDemoSeller(s.sellerId)));
    setDemoSellers(all.filter((s) => dataService.isDemoSeller(s.sellerId)));
  };

  useEffect(() => {
    syncSellersState();
  }, [currentHash]);

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to online / offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  // Parse Hash
  const hash = currentHash.replace(/^#\/?/, '');

  // 1. Customer form: #/s/:handle
  if (hash.startsWith('s/')) {
    const handle = hash.substring(2).split('?')[0];
    return (
      <div className="relative">
        {!isOnline && (
          <div className="bg-stone-900 text-stone-200 text-[11px] p-2 text-center flex items-center justify-center gap-1.5 z-50">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>اینترنت قطع است. سفارش فقط روی همین دستگاه ذخیره می‌شود.</span>
          </div>
        )}
        <CustomerFormView
          handle={handle}
          onNavigateToTrack={(orderId) => navigateTo(`#/track/${orderId}`)}
          onNavigateToPanel={() => navigateTo('#/panel')}
        />
      </div>
    );
  }

  // 2. Tracking view: #/track/:token or #/track
  if (hash === 'track' || hash.startsWith('track/')) {
    const token = hash.startsWith('track/') ? hash.substring(6).split('?')[0] : '';
    return (
      <div className="relative">
        <TrackingView
          token={token}
          onNavigateHome={() => navigateTo('#/')}
          onNavigateToShop={(handle) => {
            const targetHandle = handle || activeSeller?.handle || 'shop';
            navigateTo(`#/s/${targetHandle}`);
          }}
        />
      </div>
    );
  }

  // 3. Seller Setup wizard: #/setup
  if (hash === 'setup') {
    return (
      <SellerSetupView
        onComplete={(newSellerId) => {
          setCurrentSellerId(newSellerId);
          dataService.setCurrentSellerId(newSellerId);
          navigateTo('#/panel');
        }}
        onCancel={() => navigateTo('#/')}
      />
    );
  }

  // 4. Seller Login / Selection: #/login
  if (hash === 'login') {
    return (
      <LoginView
        onLoginSuccess={(sellerId) => {
          setCurrentSellerId(sellerId);
          dataService.setCurrentSellerId(sellerId);
          navigateTo('#/panel');
        }}
        onNavigateToSetup={() => navigateTo('#/setup')}
        onNavigateToCustomerDemo={(handle) => navigateTo(`#/s/${handle}`)}
      />
    );
  }

  // 5. Seller Panel: #/panel
  if (hash === 'panel') {
    return (
      <div className="relative">
        {!isOnline && (
          <div className="bg-stone-900 text-stone-200 text-[11px] p-2 text-center flex items-center justify-center gap-1.5 z-50">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>اینترنت قطع است. این نسخهٔ نمایشی داده‌ها را فقط روی همین دستگاه نگه می‌دارد.</span>
          </div>
        )}
        <SellerPanelView
          sellerId={currentSellerId}
          onLogout={() => navigateTo('#/login')}
          onNavigateToShop={(handle) => navigateTo(`#/s/${handle}`)}
          onNavigateToSetup={() => navigateTo('#/setup')}
        />
      </div>
    );
  }

  // 6. Default root landing: Portal & SaaS Launcher
  const shopCustomerUrl = activeSeller
    ? `${window.location.origin}${window.location.pathname}#/s/${activeSeller.handle}`
    : '';

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between max-w-md mx-auto shadow-md border-x border-stone-200">
      <header className="bg-white border-b border-stone-200 p-5 text-center">
        <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
          <Store className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-black text-stone-900">سفارش‌یار</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          سامانه اختصاصی سفارش‌گیری پیج‌های اینستاگرامی با لینک اختصاصی
        </p>
      </header>

      <main className="p-4 space-y-3.5 flex-1">
        {/* Architecture Notice */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5 text-emerald-950">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>لینک اختصاصی و مستقل برای هر فروشگاه:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-900">
            هر فروشگاهی که تعریف می‌کنید، فقط لینک اختصاصی خود را دریافت می‌کند و مشتری منحصراً محصولات و شماره کارت همان فروشگاه را می‌بیند.
          </p>
        </div>

        {/* PRIMARY CTA: Define & Create Brand New Shop */}
        <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>راه‌اندازی و افتتاح فروشگاه اختصاصی:</span>
            </div>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
              فوری در ۱ دقیقه
            </span>
          </div>
          <p className="text-[11px] text-emerald-50 leading-relaxed">
            نام پیج، شماره کارت و اولین محصول خود را ثبت کنید و بلافاصله لینک اختصاصی دایرکت بگیرید.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('#/setup')}
            className="w-full py-3 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>+ تعریف فروشگاه جدید من</span>
          </button>
        </div>

        {/* Active Store Section (if user has custom store or selected store) */}
        {activeSeller && (
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-400 block">فروشگاه فعال در این مرورگر:</span>
                <h2 className="text-xs sm:text-sm font-black text-stone-900 mt-0.5">
                  {activeSeller.shop_name}
                </h2>
                <span className="text-[11px] text-stone-500 font-mono" dir="ltr">
                  @{activeSeller.handle}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                dataService.isDemoSeller(activeSeller.sellerId)
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {dataService.isDemoSeller(activeSeller.sellerId) ? 'حالت آزمایشی (دمو)' : 'فروشگاه عملیاتی شما'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigateTo('#/panel')}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ورود به پنل مدیریت</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo(`#/s/${activeSeller.handle}`)}
                className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>فرم از دید مشتری</span>
              </button>
            </div>

            {/* Direct Link Share & Copy */}
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-stone-600 truncate max-w-[200px]" dir="ltr">
                {shopCustomerUrl}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shopCustomerUrl);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="px-2 py-1 bg-white border border-stone-300 text-stone-700 text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-stone-100 transition-colors"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'کپی شد' : 'کپی لینک'}</span>
              </button>
            </div>
          </div>
        )}

        {/* User's registered stores list (if multiple) */}
        {customSellers.length > 1 && (
          <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-2">
            <span className="text-xs font-bold text-stone-800 block">سایر فروشگاه‌های شما:</span>
            <div className="space-y-1.5">
              {customSellers
                .filter((s) => s.sellerId !== currentSellerId)
                .map((s) => (
                  <button
                    key={s.sellerId}
                    type="button"
                    onClick={() => {
                      dataService.setCurrentSellerId(s.sellerId);
                      setCurrentSellerId(s.sellerId);
                      setActiveSeller(s);
                      navigateTo('#/panel');
                    }}
                    className="w-full p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-right flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900">{s.shop_name}</div>
                      <div className="text-[10px] text-stone-500 font-mono" dir="ltr">@{s.handle}</div>
                    </div>
                    <span className="text-xs text-amber-700 font-bold">ورود به پنل ←</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Tracking & Customer Portal */}
        <div className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-stone-800">رهگیری مرسوله پستی:</div>
            <div className="text-[11px] text-stone-500">استعلام آنلاین وضعیت با کد پیگیری سفارش</div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('#/track')}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold transition-colors"
          >
            پیگیری مرسوله
          </button>
        </div>

        {/* Clean Production / Demo Sandbox Tools */}
        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 text-[11px]">ابزارهای داده و راه‌اندازی:</span>
            <button
              type="button"
              onClick={() => navigateTo('#/login')}
              className="text-[11px] text-amber-700 font-bold hover:underline"
            >
              صفحه ورود با آیدی
            </button>
          </div>

          {demoSellers.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                className="w-full py-2.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاکسازی کامل نمونه‌های تستی (شروع کاملاً خام)</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        سفارش‌یار • سیستم مدیریت سفارش و لینک اختصاصی دایرکت اینستاگرام
      </footer>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="پاکسازی کامل داده‌های تستی"
        message="آیا مطمئنید می‌خواهید تمام داده‌ها و فروشگاه‌های نمونه پاک شوند تا سیستم کاملاً خام و آماده استفاده شخصی شما شود؟"
        confirmLabel="بله، پاکسازی کامل"
        cancelLabel="انصراف"
        isDestructive={true}
        onConfirm={async () => {
          await dataService.clearAllDemoData();
          await syncSellersState();
          setIsClearConfirmOpen(false);
          showToast('داده‌های تستی پاک شدند! اکنون می‌توانید فروشگاه جدید خود را ثبت کنید.', 'success');
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
