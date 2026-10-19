import React, { useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { Bezel, Button, Field, IconButton } from '../ui/kit';
import { dataService } from '../services/dataService';

export function SignIn({ onBack, onEnter, onCreate }: { onBack: () => void; onEnter: (sellerId: string) => void; onCreate: () => void }) {
  const shops = dataService.getAllSellers();
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = handle.trim().replace(/^@/, '').toLowerCase();
    const found = shops.find((s) => s.handle.toLowerCase() === h);
    if (found) onEnter(found.sellerId);
    else setError('فروشگاهی با این آیدی روی این گوشی نیست.');
  };

  return (
    <div className="min-h-dvh max-w-lg mx-auto px-5 pt-4 pb-10">
      <IconButton label="برگشت" onClick={onBack} className="-mr-2">
        <ArrowRight className="w-5 h-5" />
      </IconButton>
      <div className="pt-6 space-y-8 animate-rise">
        <div className="space-y-2">
          <h1 className="text-[1.6rem] font-extrabold text-ink-900">ورود به فروشگاه</h1>
          <p className="text-base leading-8 text-ink-600">فروشگاه‌هایی که روی این گوشی ساخته‌اید.</p>
        </div>

        {shops.length > 0 && (
          <ul className="space-y-3">
            {shops.map((s) => (
              <li key={s.sellerId}>
                <Bezel as="button" onClick={() => onEnter(s.sellerId)} innerClassName="p-4 flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-lg flex items-center justify-center">
                    {s.shop_name.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-bold text-ink-900 truncate">{s.shop_name}</span>
                    <span className="block text-xs text-ink-500" dir="ltr">
                      @{s.handle}
                    </span>
                  </span>
                  {dataService.isDemoSeller(s.sellerId) && (
                    <span className="text-xs text-ink-500 bg-ink-900/[0.05] rounded-full px-2.5 py-1">نمونه</span>
                  )}
                  <ChevronLeft className="w-5 h-5 text-ink-400" />
                </Bezel>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Field
            label="یا آیدی پیج را بنویسید"
            ltr
            suffix="@"
            placeholder="your_page"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setError('');
            }}
            error={error}
          />
          <Button type="submit" block>
            ورود
          </Button>
        </form>

        <Button variant="quiet" block onClick={onCreate}>
          ساختن فروشگاه تازه
        </Button>
      </div>
    </div>
  );
}
