import React, { useState, useEffect } from 'react';
import { CustomerFormView } from './views/CustomerFormView';
import { TrackingView } from './views/TrackingView';
import { SellerPanelView } from './views/SellerPanelView';
import { LoginView } from './views/LoginView';
import { SellerSetupView } from './views/SellerSetupView';
import { dataService } from './services/dataService';
import {
  Store,
  Truck,
  Layers,
  WifiOff,
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#/');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentSellerId, setCurrentSellerId] = useState<string>(dataService.getCurrentSellerId());

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to online / offline events (PRD Section 12 & 16)
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
  const hash = currentHash.replace(/^#\/?/, ''); // e.g. "s/nora_candle" or "track/ord_123"

  // 1. Customer form: #/s/:handle
  if (hash.startsWith('s/')) {
    const handle = hash.substring(2).split('?')[0];
    return (
      <div className="relative">
        {!isOnline && (
          <div className="bg-stone-900 text-stone-200 text-[11px] p-2 text-center flex items-center justify-center gap-1.5 z-50">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>حالت آفلاین: اطلاعات به طور محلی ذخیره می‌شود.</span>
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
          onNavigateToShop={(handle) => navigateTo(`#/s/${handle || 'nora_candle'}`)}
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
        onCancel={() => navigateTo('#/login')}
      />
    );
  }

  // 4. Seller Login: #/login
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
            <span>حالت آفلاین: تغییرات پس از اتصال به اینترنت همگام می‌شود.</span>
          </div>
        )}
        <SellerPanelView
          sellerId={currentSellerId}
          onLogout={() => navigateTo('#/login')}
          onNavigateToShop={(handle) => navigateTo(`#/s/${handle}`)}
        />
      </div>
    );
  }

  // 6. Default root landing: Directly route to seller panel, or show single link launcher
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between max-w-md mx-auto shadow-md border-x border-stone-200">
      <header className="bg-white border-b border-stone-200 p-5 text-center">
        <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
          <Store className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-black text-stone-900">سفارش‌یار ۲</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          سیستم مدیریت سفارش و لینک اختصاصی دایرکت اینستاگرام
        </p>
      </header>

      <main className="p-4 space-y-4 flex-1">
        {/* Dedicated Single Link Notice */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2 text-emerald-950">
          <div className="flex items-center gap-2 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>معماری تک‌لینکی اختصاصی (Single Store Link):</span>
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-900">
            مشتری شما هرگز نام یا محصولات فروشگاه‌های دیگر را نمی‌بیند. شما فقط یک لینک اختصاصی در بیو یا پاسخ سریع دایرکت (Quick Reply) قرار می‌دهید.
          </p>
        </div>

        {/* Enter Seller Panel */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
          <div className="text-xs font-bold text-stone-800">ورود به عنوان فروشنده:</div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            تأیید فیش‌های واریزی، مدیریت صف ساخت کارگاه، چاپ برچسب پستی و افزودن محصولات جدید
          </p>
          <button
            type="button"
            onClick={() => navigateTo('#/panel')}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>ورود به پنل ۴ تبی فروشنده</span>
          </button>
        </div>

        {/* Test Dedicated Customer Link */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
          <div className="text-xs font-bold text-stone-800">مشاهده لینک فرم از دید مشتری:</div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            همان لینکی که مشتری از دایرکت باز می‌کند (مستقل و بدون تبلیغ):
          </p>
          <button
            type="button"
            onClick={() => navigateTo('#/s/nora_candle')}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>باز کردن لینک اختصاصی مشتری (#/s/nora_candle)</span>
          </button>
        </div>

        {/* Tracking */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => navigateTo('#/track')}
            className="text-xs text-stone-600 hover:text-stone-900 font-bold underline"
          >
            پیگیری مرسوله با کد پیگیری
          </button>
        </div>
      </main>

      <footer className="p-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        سفارش‌یار ۲ • ۱۰۰٪ قطعی بدون هوش مصنوعی (Deterministic)
      </footer>
    </div>
  );
}
