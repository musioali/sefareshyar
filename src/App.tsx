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
          <div className="bg-stone-900 text-stone-200 text-xs p-2 text-center flex items-center justify-center gap-1.5 z-50">
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
          <div className="bg-stone-900 text-stone-200 text-xs p-2 text-center flex items-center justify-center gap-1.5 z-50">
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

  // 6. Default root landing: guided demo for first-time visitors
  const isCustomActive = Boolean(activeSeller && !dataService.isDemoSeller(activeSeller.sellerId));
  const shopCustomerUrl = isCustomActive && activeSeller
    ? `${window.location.origin}${window.location.pathname}#/s/${activeSeller.handle}`
    : '';
  const hasNoraDemo = demoSellers.some((s) => s.sellerId === 'seller_nora');

  const openNoraPanel = () => {
    dataService.setCurrentSellerId('seller_nora');
    setCurrentSellerId('seller_nora');
    navigateTo('#/panel');
  };

  const demoSteps = [
    {
      title: 'جای مشتری سفارش بدهید',
      body: 'لینکی که فروشنده در دایرکت می‌فرستد را باز کنید و یک شمع سفارش بدهید. با شمارهٔ ۰۹۱۲۳۴۵۶۷۸۹ وارد شوید تا ببینید مشتری قبلی چطور شناخته می‌شود.',
      action: 'باز کردن لینک سفارش نورا',
      onClick: () => navigateTo('#/s/nora_candle'),
    },
    {
      title: 'جای فروشنده سفارش را ببینید',
      body: 'سفارش با همهٔ جزئیات و فیش در پنل می‌نشیند. فیش را تأیید کنید، سفارش را به صف ساخت ببرید و با کد رهگیری ارسالش کنید.',
      action: 'ورود به پنل نورا',
      onClick: openNoraPanel,
    },
    {
      title: 'مشتری خودش پیگیری می‌کند',
      body: 'به‌جای پیام «سفارشم کجاست؟»، مشتری با کد کوتاه سفارش وضعیت و کد رهگیری را خودش می‌بیند. کد نمونه: P5L9Q',
      action: 'صفحهٔ پیگیری',
      onClick: () => navigateTo('#/track'),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col max-w-md mx-auto shadow-md border-x border-stone-200">
      <header className="bg-white border-b border-stone-200 px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-amber-600 text-white rounded-2xl flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-900">سفارش‌یار</h1>
            <p className="text-sm text-stone-600">سفارش‌های دایرکت، یک‌جا و بدون گم شدن</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-7 text-stone-700">
          در نظرسنجی ۲۰۰ فروشندهٔ خانگی اینستاگرام، ۶۵٪ در سه ماه گذشته دست‌کم یک سفارش را گم یا فراموش کرده بودند و ۸۳٪ هیچ فهرستی از مشتری‌هایشان نداشتند. سفارش‌یار به فروشنده لینکی می‌دهد که مشتری خودش سفارش را در آن کامل کند.
        </p>
      </header>

      <main className="p-4 space-y-4 flex-1">
        <section className="space-y-3" aria-labelledby="demo-title">
          <h2 id="demo-title" className="text-sm font-black text-stone-900">در سه قدم امتحانش کنید</h2>

          {hasNoraDemo ? (
            <ol className="space-y-3">
              {demoSteps.map((step, i) => (
                <li key={step.title} className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-amber-100 text-amber-800 text-sm font-black flex items-center justify-center">
                      {['۱', '۲', '۳'][i]}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-stone-900">{step.title}</h3>
                      <p className="text-sm leading-6 text-stone-600">{step.body}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={step.onClick}
                    className={`w-full min-h-11 px-3 rounded-xl text-sm font-bold transition-colors ${
                      i === 0
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200'
                    }`}
                  >
                    {step.action}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3">
              <p className="text-sm leading-6 text-stone-600">فروشگاه نمونهٔ نورا پاک شده است.</p>
              <button
                type="button"
                onClick={async () => {
                  await dataService.resetToDemoData();
                  await syncSellersState();
                  showToast('داده‌های نمونه برگشت.', 'success');
                }}
                className="w-full min-h-11 px-3 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                برگرداندن فروشگاه نمونه
              </button>
            </div>
          )}

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-sm leading-6 text-amber-950">
            این نسخهٔ نمایشی است و داده‌ها فقط در همین مرورگر ذخیره می‌شوند، پس نقش مشتری و فروشنده را خودتان روی همین دستگاه بازی می‌کنید. در نسخهٔ واقعی، سفارش از گوشی مشتری به پنل فروشنده می‌رسد.
          </div>
        </section>

        <section className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3" aria-labelledby="own-shop-title">
          <h2 id="own-shop-title" className="text-sm font-black text-stone-900">فروشگاه خودتان</h2>

          {isCustomActive && activeSeller ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-stone-900">{activeSeller.shop_name}</div>
                  <div className="text-xs text-stone-500" dir="ltr">@{activeSeller.handle}</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('#/panel')}
                  className="min-h-11 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>پنل</span>
                </button>
              </div>
              <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
                <span className="text-xs text-stone-600 truncate" dir="ltr">{shopCustomerUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shopCustomerUrl);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="min-h-11 px-3 bg-white border border-stone-300 text-stone-800 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'کپی شد' : 'کپی لینک سفارش'}</span>
                </button>
              </div>
              {customSellers.length > 1 && (
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
                        className="w-full min-h-11 p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-right flex items-center justify-between"
                      >
                        <span className="text-sm font-bold text-stone-900">{s.shop_name}</span>
                        <span className="text-xs text-amber-700 font-bold">ورود به پنل</span>
                      </button>
                    ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm leading-6 text-stone-600">
              نام پیج، شماره کارت و اولین محصول را وارد کنید و لینک سفارش اختصاصی بگیرید.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigateTo('#/setup')}
            className="w-full min-h-11 px-3 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isCustomActive ? 'ساختن فروشگاه دیگر' : 'ساختن فروشگاه'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('#/login')}
            className="w-full min-h-11 text-sm font-bold text-amber-800 hover:underline"
          >
            ورود به فروشگاهی که قبلاً ساخته‌اید
          </button>
        </section>

        {demoSellers.length > 0 && (
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            className="w-full min-h-11 px-3 text-rose-700 hover:bg-rose-50 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاک کردن فروشگاه‌های نمونه</span>
          </button>
        )}
      </main>

      <footer className="p-4 text-center text-xs text-stone-500 border-t border-stone-200 bg-white">
        سفارش‌یار، نسخهٔ نمایشی برای چالش ریشه‌یابی
      </footer>

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="پاک کردن فروشگاه‌های نمونه"
        message="فروشگاه‌ها و سفارش‌های نمونه از این مرورگر پاک می‌شوند. هر وقت بخواهید می‌توانید از همین صفحه برشان گردانید."
        confirmLabel="پاک شود"
        cancelLabel="انصراف"
        isDestructive={true}
        onConfirm={async () => {
          await dataService.clearAllDemoData();
          await syncSellersState();
          setIsClearConfirmOpen(false);
          showToast('نمونه‌ها پاک شدند.', 'success');
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
