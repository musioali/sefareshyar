import React, { useEffect, useState } from 'react';
import { CalendarClock, Check, Copy, ExternalLink, Search } from 'lucide-react';
import { BrandMark, Bezel, Button, Field, cx } from '../ui/kit';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { PublicStatus } from '../types';
import { formatToman, toPersianDigits } from '../utils/persianUtils';
import { copyText, timeAgo } from '../lib/format';

const STEPS = ['سفارش ثبت شد', 'واریز تأیید شد', 'در حال ساخت', 'بسته‌بندی شد', 'ارسال شد'];

function stepIndex(status: PublicStatus['status']): number {
  switch (status) {
    case 'submitted':
    case 'needs_info':
      return 0;
    case 'confirmed':
      return 1;
    case 'in_production':
      return 2;
    case 'packed':
      return 3;
    case 'shipped':
      return 4;
    default:
      return -1;
  }
}

export function Tracking({ token, onNewSearch }: { token: string; onNewSearch: (code: string) => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<PublicStatus | null | undefined>(undefined);
  const [code, setCode] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus(null);
        return;
      }
      dataService.syncFromStorage();
      const s = await dataService.getPublicStatus(token);
      setStatus(s);
      if (s) dataService.logEvent(s.seller_id, 'status_page_viewed', { orderId: s.order_id });
    })();
  }, [token]);

  if (status === undefined) return <div className="min-h-dvh" />;

  if (!status) {
    return (
      <div className="min-h-dvh max-w-lg mx-auto px-5 pt-14 space-y-8 animate-rise">
        <div className="flex flex-col items-center text-center gap-3">
          <BrandMark size={88} />
          <h1 className="text-[1.6rem] font-extrabold text-ink-900">پیگیری سفارش</h1>
          <p className="text-base leading-8 text-ink-600">کد پنج‌حرفی سفارش را وارد کنید.</p>
          {token && <p className="text-sm text-rose-700">سفارشی با این کد پیدا نشد.</p>}
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) onNewSearch(code.trim().toUpperCase());
          }}
        >
          <Field label="کد سفارش" ltr placeholder="P5L9Q" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button type="submit" block lead={<Search className="w-4 h-4" />}>
            پیگیری
          </Button>
        </form>
      </div>
    );
  }

  const idx = stepIndex(status.status);
  const cancelled = status.status === 'cancelled';

  return (
    <div className="min-h-dvh max-w-lg mx-auto px-5 pt-6 pb-14 space-y-6">
      <header className="flex items-center gap-3 animate-rise">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 via-[#10a0e0] to-leaf-400 text-white text-xl font-extrabold flex items-center justify-center shadow-[var(--shadow-brand)]">
          {status.shop_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-ink-500">سفارش از</p>
          <h1 className="text-lg font-extrabold text-ink-900 truncate">{status.shop_name}</h1>
        </div>
        <span className="mr-auto text-sm font-extrabold text-brand-700 bg-brand-50 rounded-full px-3 py-1.5 tabular" dir="ltr">
          {status.short_code}
        </span>
      </header>

      <div className="animate-rise [animation-delay:80ms]">
        <h2 className="text-[1.6rem] font-extrabold text-ink-900 leading-snug">
          {cancelled ? 'این سفارش لغو شد' : status.status === 'needs_info' ? 'فروشنده سؤالی دارد' : STEPS[Math.max(0, idx)]}
        </h2>
        {status.eta_text && !cancelled && status.status !== 'shipped' && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <CalendarClock className="w-4 h-4" /> آماده شدن تا حدود {status.eta_text}
          </p>
        )}
        <p className="mt-1 text-sm text-ink-500">به‌روزرسانی {timeAgo(status.updated_at)}</p>
      </div>

      {status.status === 'needs_info' && status.needs_info_reason && (
        <div className="rounded-3xl bg-parcel-50 ring-1 ring-parcel-600/15 p-4 text-sm leading-7 text-parcel-700 animate-rise">
          فروشنده پرسیده: {status.needs_info_reason}
          <br />
          جواب را در دایرکت پیج بفرستید.
        </div>
      )}

      {!cancelled && (
        <Bezel className="animate-rise [animation-delay:140ms]" innerClassName="p-5">
          <ol className="relative">
            {STEPS.map((label, i) => {
              const doneStep = i <= idx;
              const current = i === idx;
              return (
                <li key={label} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cx('absolute right-[0.9rem] top-8 bottom-0 w-0.5 rounded-full', i < idx ? 'bg-leaf-500' : 'bg-ink-100')}
                    />
                  )}
                  <span
                    className={cx(
                      'relative w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      doneStep ? 'bg-leaf-500 text-white' : 'bg-ink-100 text-ink-400',
                      current && 'ring-4 ring-leaf-100'
                    )}
                  >
                    {doneStep ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold tabular">{toPersianDigits(i + 1)}</span>}
                  </span>
                  <span className={cx('pt-1 text-base', doneStep ? 'font-bold text-ink-900' : 'text-ink-400')}>{label}</span>
                </li>
              );
            })}
          </ol>
        </Bezel>
      )}

      {status.tracking_code && (
        <Bezel className="animate-rise [animation-delay:200ms]" innerClassName="p-5 space-y-3">
          <p className="text-sm text-ink-500">کد رهگیری {status.carrier === 'tipax' ? 'تیپاکس' : 'پست'}</p>
          <p className="text-xl font-extrabold text-ink-900 tabular break-all" dir="ltr" style={{ textAlign: 'right' }}>
            {status.tracking_code}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              lead={<Copy className="w-4 h-4" />}
              onClick={async () => {
                const ok = await copyText(status.tracking_code!);
                toast(ok ? 'کد رهگیری کپی شد' : 'کپی نشد', ok ? 'ok' : 'error');
              }}
            >
              کپی کد
            </Button>
            {status.tracking_url ? (
              <Button lead={<ExternalLink className="w-4 h-4" />} onClick={() => window.open(status.tracking_url, '_blank', 'noopener')}>
                سامانهٔ پست
              </Button>
            ) : (
              <span />
            )}
          </div>
        </Bezel>
      )}

      <Bezel className="animate-rise [animation-delay:260ms]" innerClassName="p-5 space-y-2">
        <p className="text-sm text-ink-500">سفارش</p>
        <p className="text-base text-ink-900 leading-8">{toPersianDigits(status.items_summary.replace(/\s*\(.*?\)/g, ''))}</p>
        {typeof status.total_amount === 'number' && (
          <p className="text-base font-extrabold text-ink-900 tabular">{formatToman(status.total_amount)}</p>
        )}
      </Bezel>

      <footer className="pt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400">
        <BrandMark size={20} /> پیگیری با سفارش‌یار
      </footer>
    </div>
  );
}
