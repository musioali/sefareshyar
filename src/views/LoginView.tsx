import React, { useState, useEffect } from 'react';
import { Store, ArrowLeft, Sparkles, UserCheck, Plus, ExternalLink, HelpCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Seller } from '../types';

interface LoginViewProps {
  onLoginSuccess: (sellerId: string) => void;
  onNavigateToSetup: () => void;
  onNavigateToCustomerDemo: (handle: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToSetup,
  onNavigateToCustomerDemo,
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [customSellers, setCustomSellers] = useState<Seller[]>([]);
  const [demoSellers, setDemoSellers] = useState<Seller[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const all = dataService.getAllSellers();
    setCustomSellers(all.filter((s) => !dataService.isDemoSeller(s.sellerId)));
    setDemoSellers(all.filter((s) => dataService.isDemoSeller(s.sellerId)));
  }, []);

  const handleLoginByHandle = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const clean = handleInput.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setErrorMessage('لطفاً آیدی اینستاگرام (handle) فروشگاه را وارد کنید');
      return;
    }

    const all = dataService.getAllSellers();
    const found = all.find((s) => s.handle.toLowerCase() === clean);
    if (found) {
      onLoginSuccess(found.sellerId);
    } else {
      setErrorMessage(`فروشگاهی با آیدی @${clean} یافت نشد. می‌توانید همین حالا آن را تعریف کنید.`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 max-w-md mx-auto shadow-md border-x border-stone-200 flex flex-col justify-between p-5">
      <div className="space-y-5 pt-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-stone-900">سفارش‌یار</h1>
          <p className="text-xs text-stone-500">
            سامانه ثبت و مدیریت سفارش‌های اینستاگرام با لینک اختصاصی
          </p>
        </div>

        {/* Primary Hero CTA: Create/Define New Store */}
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-xs space-y-2 text-center">
          <div className="text-xs font-black text-emerald-900">
            هنوز فروشگاه خود را تعریف نکرده‌اید؟
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            در کمتر از ۱ دقیقه نام پیج، شماره کارت و اولین محصول خود را ثبت کنید و لینک اختصاصی دایرکت بگیرید:
          </p>
          <button
            type="button"
            onClick={onNavigateToSetup}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>+ تعریف و افتتاح فروشگاه جدید (۱ دقیقه)</span>
          </button>
        </div>

        {/* User's Registered Stores (if any exist) */}
        {customSellers.length > 0 && (
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span>فروشگاه‌های فعال شما:</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                {customSellers.length} فروشگاه
              </span>
            </div>
            <div className="space-y-2">
              {customSellers.map((s) => (
                <div
                  key={s.sellerId}
                  className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">{s.shop_name}</div>
                    <div className="text-[11px] text-stone-500 font-mono" dir="ltr">
                      @{s.handle}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLoginSuccess(s.sellerId)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      ورود به پنل
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToCustomerDemo(s.handle)}
                      title="مشاهده فرم مشتری"
                      className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enter by Instagram ID / Handle Form */}
        <form onSubmit={handleLoginByHandle} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
          <div className="font-bold text-stone-800">ورود با آیدی اینستاگرام پیج:</div>
          <div>
            <label className="block text-stone-600 mb-1">نام کاربری اینستاگرام (Handle):</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-stone-400 font-mono">@</span>
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="my_shop"
                className="w-full p-2.5 pl-8 bg-stone-50 border border-stone-300 rounded-xl text-left font-mono text-stone-900 focus:ring-2 focus:ring-amber-500"
                dir="ltr"
              />
            </div>
            {errorMessage && (
              <div className="text-[11px] text-rose-600 mt-1.5 font-bold">
                {errorMessage}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold shadow-xs transition-colors"
          >
            ورود به پنل فروشگاه
          </button>
        </form>

        {/* Demo Section (Optional Sandbox) */}
        {demoSellers.length > 0 && (
          <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-600 font-bold text-[11px]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                <span>فروشگاه‌های نمونه تستی (صرفاً جهت بررسی دمو):</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {demoSellers.map((s) => (
                <button
                  key={s.sellerId}
                  type="button"
                  onClick={() => onLoginSuccess(s.sellerId)}
                  className="p-2 bg-white border border-stone-200 rounded-xl text-right hover:border-amber-400 transition-colors"
                >
                  <div className="text-[11px] font-bold text-stone-800 truncate">{s.shop_name}</div>
                  <div className="text-[10px] text-stone-400 font-mono" dir="ltr">@{s.handle}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="pt-6 pb-2 text-center text-[11px] text-stone-400">
        سفارش‌یار • سیستم مدیریت سفارش و لینک مستقیم دایرکت
      </footer>
    </div>
  );
};
