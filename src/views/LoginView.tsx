import React, { useState } from 'react';
import { Store, ArrowLeft, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { dataService } from '../services/dataService';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In local architecture, standard login routes to current seller or nora
    onLoginSuccess('seller_nora');
  };

  return (
    <div className="min-h-screen bg-stone-50 max-w-md mx-auto shadow-md border-x border-stone-200 flex flex-col justify-between p-6">
      <div className="space-y-6 pt-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-stone-900">سفارش‌یار ۲</h1>
          <p className="text-xs text-stone-500">
            سامانه ساختاریافته سفارش‌گیری اینستاگرام بدون هوش مصنوعی
          </p>
        </div>

        {/* Demo Fast Login Cards */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>ورود سریع به فروشگاه‌های نمونه آزمایشی:</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onLoginSuccess('seller_nora')}
              className="w-full p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-right flex items-center justify-between group transition-all"
            >
              <div>
                <div className="text-xs font-bold text-stone-900">شمع دست‌ساز نورا</div>
                <div className="text-[11px] text-stone-500 font-mono">@nora_candle • محصولات ثابت</div>
              </div>
              <span className="text-xs text-amber-700 font-bold group-hover:translate-x-[-2px] transition-transform">
                ورود به پنل ←
              </span>
            </button>

            <button
              type="button"
              onClick={() => onLoginSuccess('seller_sepideh')}
              className="w-full p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-right flex items-center justify-between group transition-all"
            >
              <div>
                <div className="text-xs font-bold text-stone-900">مزون و آرت سپیده</div>
                <div className="text-[11px] text-stone-500 font-mono">@sepideh_art • محصولات سفارشی</div>
              </div>
              <span className="text-xs text-amber-700 font-bold group-hover:translate-x-[-2px] transition-transform">
                ورود به پنل ←
              </span>
            </button>
          </div>
        </div>

        {/* Standard Email/Password Login Form */}
        <form onSubmit={handleCustomLogin} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
          <div className="font-bold text-stone-800">ورود با ایمیل و رمز:</div>
          <div>
            <label className="block text-stone-600 mb-1">ایمیل:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seller@example.com"
              className="w-full p-2.5 bg-stone-50 border rounded-xl text-left font-mono"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-stone-600 mb-1">رمز عبور:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 bg-stone-50 border rounded-xl text-left font-mono"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold shadow-xs transition-colors"
          >
            ورود به حساب فروشنده
          </button>
        </form>

        {/* New Seller Setup Wizard Button */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onNavigateToSetup}
            className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-2xl text-xs font-bold transition-colors"
          >
            + ثبت‌نام و راه‌اندازی فروشگاه جدید (ویزارد ۴ مرحله‌ای)
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-stone-400 py-4">
        سفارش‌یار ۲ • پلتفرم ثبت سفارش قطعی برای فروشندگان خانگی
      </div>
    </div>
  );
};
