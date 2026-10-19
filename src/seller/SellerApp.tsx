import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, Users, Package, Store, Share2 } from 'lucide-react';
import { BrandMark, IconButton, cx } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { Customer, Order, Product, Seller } from '../types';
import { copyText, shopLink } from '../lib/format';
import { OrdersScreen } from './Orders';
import { CustomersScreen } from './Customers';
import { ProductsScreen } from './Products';
import { ShopScreen } from './Shop';

export type Tab = 'orders' | 'customers' | 'products' | 'shop';

export interface SellerData {
  seller: Seller;
  orders: Order[];
  customers: Customer[];
  products: Product[];
  reload: () => Promise<void>;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'orders', label: 'سفارش‌ها', icon: Inbox },
  { id: 'customers', label: 'مشتری‌ها', icon: Users },
  { id: 'products', label: 'محصولات', icon: Package },
  { id: 'shop', label: 'فروشگاه', icon: Store },
];

export function SellerApp({
  sellerId,
  onCreateShop,
  onSwitchShop,
  onOpenStorefront,
}: {
  sellerId: string;
  onCreateShop: () => void;
  onSwitchShop: () => void;
  onOpenStorefront: (handle: string) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('orders');
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const reload = useCallback(async () => {
    dataService.syncFromStorage();
    const s = await dataService.getSellerById(sellerId);
    setSeller(s);
    if (!s) return;
    const [o, c, p] = await Promise.all([
      dataService.listOrders(sellerId),
      dataService.listCustomers(sellerId),
      dataService.listProducts(sellerId),
    ]);
    setOrders([...o].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setCustomers(c);
    setProducts(p);
  }, [sellerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // pick up orders placed from the customer link in another tab of this browser
  useEffect(() => {
    const onStorage = () => reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onStorage);
    };
  }, [reload]);

  if (!seller) {
    return <div className="min-h-dvh" />;
  }

  const data: SellerData = { seller, orders, customers, products, reload };
  const isSample = dataService.isDemoSeller(seller.sellerId);
  const newCount = orders.filter((o) => o.status === 'submitted').length;

  const share = async () => {
    const ok = await copyText(shopLink(seller.handle));
    toast(ok ? 'لینک سفارش کپی شد' : 'کپی نشد', ok ? 'ok' : 'error');
  };

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-32">
      <header className="px-5 pt-5 pb-2 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white ring-1 ring-ink-900/[0.06] shadow-[var(--shadow-float)] flex items-center justify-center shrink-0">
          <BrandMark size={38} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-ink-900 truncate">{seller.shop_name}</h1>
            {isSample && <span className="text-xs text-ink-600 bg-ink-900/[0.06] rounded-full px-2 py-0.5 shrink-0">نمونه</span>}
          </div>
          <p className="text-xs text-ink-500" dir="ltr" style={{ textAlign: 'right' }}>
            @{seller.handle}
          </p>
        </div>
        <IconButton label="کپی لینک سفارش" onClick={share} className="bg-white ring-1 ring-ink-900/10 shadow-[var(--shadow-float)]">
          <Share2 className="w-5 h-5" />
        </IconButton>
      </header>

      {isSample && (
        <div className="mx-5 mt-3 rounded-2xl bg-brand-50 ring-1 ring-brand-600/10 px-4 py-3 flex items-center justify-between gap-3 animate-fade">
          <p className="text-sm text-brand-900">فروشگاه نمونه، با سفارش‌های ساختگی</p>
          <button onClick={onCreateShop} className="text-sm font-bold text-brand-700 hover:text-brand-800 shrink-0 min-h-11 px-1">
            ساختن فروشگاه خودم
          </button>
        </div>
      )}

      <main className="px-5 pt-5">
        {tab === 'orders' && <OrdersScreen data={data} onOpenStorefront={() => onOpenStorefront(seller.handle)} />}
        {tab === 'customers' && <CustomersScreen data={data} />}
        {tab === 'products' && <ProductsScreen data={data} />}
        {tab === 'shop' && (
          <ShopScreen
            data={data}
            onCreateShop={onCreateShop}
            onSwitchShop={onSwitchShop}
            onOpenStorefront={() => onOpenStorefront(seller.handle)}
          />
        )}
      </main>

      {/* floating island navigation */}
      <nav
        aria-label="بخش‌های فروشگاه"
        className="fixed z-30 bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-0 flex justify-center px-4 pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/85 backdrop-blur-xl ring-1 ring-ink-900/10 shadow-[var(--shadow-lift)] p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative h-12 rounded-full flex items-center gap-1.5 text-sm font-semibold',
                  active ? 'bg-ink-900 text-white px-4' : 'text-ink-600 hover:text-ink-900 px-3.5'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className={cx(!active && 'sr-only')}>{label}</span>
                {id === 'orders' && newCount > 0 && !active && (
                  <span className="absolute top-1.5 left-2 min-w-5 h-5 px-1 rounded-full bg-parcel-500 text-white text-xs font-bold flex items-center justify-center tabular">
                    {newCount.toLocaleString('fa-IR')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
