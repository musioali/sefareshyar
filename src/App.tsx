import React, { useEffect, useState } from 'react';
import { ToastProvider } from './ui/toast';
import { dataService } from './services/dataService';
import { Home } from './seller/Home';
import { Setup } from './seller/Setup';
import { SignIn } from './seller/SignIn';
import { SellerApp } from './seller/SellerApp';
import { Storefront } from './customer/Storefront';
import { Tracking } from './customer/Tracking';

const SAMPLE = 'seller_nora';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#\/?/, ''));
  useEffect(() => {
    const on = () => setHash(window.location.hash.replace(/^#\/?/, ''));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

const go = (hash: string) => {
  window.location.hash = hash;
  window.scrollTo({ top: 0 });
};

function Router() {
  const hash = useHash();
  const [, force] = useState(0);
  const path = hash.split('?')[0];

  // customer side: the order link and the tracking page
  if (path.startsWith('s/')) {
    return <Storefront key={path} handle={path.slice(2)} onTrack={(id) => go(`#/t/${id}`)} />;
  }
  if (path === 't' || path.startsWith('t/') || path === 'track' || path.startsWith('track/')) {
    const token = path.includes('/') ? path.slice(path.indexOf('/') + 1) : '';
    return <Tracking key={token} token={token} onNewSearch={(code) => go(`#/t/${code}`)} />;
  }

  // seller side
  const enter = (sellerId: string) => {
    dataService.setCurrentSellerId(sellerId);
    dataService.markOnboarded();
    go('#/app');
    force((n) => n + 1);
  };
  const openSample = async () => {
    await dataService.ensureSampleShop();
    enter(SAMPLE);
  };

  const hasOwnShop = dataService.getCustomSellers().length > 0;
  const signedIn = dataService.isOnboarded() || hasOwnShop;
  const back = () => go(signedIn ? '#/app' : '#/');

  if (path === 'setup') {
    return <Setup onCancel={back} onDone={enter} />;
  }
  if (path === 'signin' || path === 'login') {
    return <SignIn onBack={back} onEnter={enter} onCreate={() => go('#/setup')} />;
  }

  // the seller panel; a fresh browser lands in the sample shop
  if (path === 'app') {
    if (!signedIn) return <Opening onOpen={openSample} />;
  } else {
    return (
      <Home
        signedIn={signedIn}
        onCreate={() => go('#/setup')}
        onSample={openSample}
        onStorefront={async () => {
          await dataService.ensureSampleShop();
          window.open('#/s/nora_candle', '_blank');
        }}
        onPanel={() => (signedIn ? go('#/app') : go('#/signin'))}
      />
    );
  }

  const sellerId = dataService.getCurrentSellerId();
  return (
    <SellerApp
      key={sellerId}
      sellerId={sellerId}
      onHome={() => go('#/')}
      onCreateShop={() => go('#/setup')}
      onSwitchShop={() => go('#/signin')}
      onOpenStorefront={(handle) => window.open(`#/s/${handle}`, '_blank')}
    />
  );
}

function Opening({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="min-h-dvh" />;
}

export default function App() {
  return (
    <ToastProvider>
      <Router />
    </ToastProvider>
  );
}
