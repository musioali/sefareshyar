import React, { useState, useEffect } from 'react';
import { CustomerFormView } from './views/CustomerFormView';
import { TrackingView } from './views/TrackingView';
import { SellerPanelView } from './views/SellerPanelView';
import { LoginView } from './views/LoginView';
import { SellerSetupView } from './views/SellerSetupView';
import { WelcomeView } from './views/WelcomeView';
import { dataService } from './services/dataService';
import { WifiOff } from 'lucide-react';
import { ToastProvider } from './components/Toast';

const SAMPLE_SELLER_ID = 'seller_nora';

function OfflineBanner({ text }: { text: string }) {
  return (
    <div className="bg-stone-800 text-stone-100 text-xs p-2 text-center flex items-center justify-center gap-1.5">
      <WifiOff className="w-3.5 h-3.5 text-brand-300" />
      <span>{text}</span>
    </div>
  );
}

function MainApp() {
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#/');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentSellerId, setCurrentSellerId] = useState<string>(dataService.getCurrentSellerId());

  useEffect(() => {
    setCurrentSellerId(dataService.getCurrentSellerId());
  }, [currentHash]);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const enterShop = (sellerId: string) => {
    dataService.setCurrentSellerId(sellerId);
    dataService.markOnboarded();
    setCurrentSellerId(sellerId);
    navigateTo('#/panel');
  };

  const hash = currentHash.replace(/^#\/?/, '');

  // Customer order link: #/s/:handle
  if (hash.startsWith('s/')) {
    const handle = hash.substring(2).split('?')[0];
    return (
      <div className="relative">
        {!isOnline && <OfflineBanner text="اینترنت قطع است." />}
        <CustomerFormView
          handle={handle}
          onNavigateToTrack={(orderId) => navigateTo(`#/track/${orderId}`)}
          onNavigateToPanel={() => navigateTo('#/panel')}
        />
      </div>
    );
  }

  // Customer order status: #/track/:token or #/track
  if (hash === 'track' || hash.startsWith('track/')) {
    const token = hash.startsWith('track/') ? hash.substring(6).split('?')[0] : '';
    return (
      <TrackingView
        token={token}
        onNavigateHome={() => navigateTo('#/')}
        onNavigateToShop={(handle) => navigateTo(`#/s/${handle || 'shop'}`)}
      />
    );
  }

  // Seller: create a shop
  if (hash === 'setup') {
    return (
      <SellerSetupView
        onComplete={(newSellerId) => enterShop(newSellerId)}
        onCancel={() => navigateTo('#/')}
      />
    );
  }

  // Seller: open a shop created earlier on this device
  if (hash === 'login') {
    return (
      <LoginView
        onLoginSuccess={(sellerId) => enterShop(sellerId)}
        onNavigateToSetup={() => navigateTo('#/setup')}
        onNavigateToCustomerDemo={(handle) => navigateTo(`#/s/${handle}`)}
      />
    );
  }

  // Seller app home. First launch on this device shows the welcome screen.
  const hasOwnShop = dataService.getCustomSellers().length > 0;
  if (hash !== 'panel' && !dataService.isOnboarded() && !hasOwnShop) {
    return (
      <WelcomeView
        onCreateShop={() => navigateTo('#/setup')}
        onOpenSample={() => enterShop(SAMPLE_SELLER_ID)}
        onLogin={() => navigateTo('#/login')}
      />
    );
  }

  return (
    <div className="relative">
      {!isOnline && <OfflineBanner text="اینترنت قطع است. تغییرات روی همین گوشی ذخیره می‌شود." />}
      <SellerPanelView
        key={currentSellerId}
        sellerId={currentSellerId}
        onLogout={() => navigateTo('#/login')}
        onNavigateToShop={(handle) => navigateTo(`#/s/${handle}`)}
        onNavigateToSetup={() => navigateTo('#/setup')}
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
