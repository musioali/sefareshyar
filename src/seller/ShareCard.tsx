import React from 'react';
import { Copy, ExternalLink, Send } from 'lucide-react';
import { Bezel, Button } from '../ui/kit';
import { useToast } from '../ui/toast';
import { copyText, shopLink } from '../lib/format';
import { Seller } from '../types';

export function ShareCard({
  seller,
  title = 'لینک سفارش شما',
  body = 'این لینک را در بیو بگذارید یا در جواب دایرکت بفرستید. مشتری محصول را انتخاب می‌کند، آدرس و فیش را می‌فرستد و سفارش همین‌جا می‌نشیند.',
  onOpen,
}: {
  seller: Seller;
  title?: string;
  body?: string;
  onOpen?: () => void;
}) {
  const toast = useToast();
  const link = shopLink(seller.handle);

  const copy = async (text: string, msg: string) => {
    const ok = await copyText(text);
    toast(ok ? msg : 'کپی نشد', ok ? 'ok' : 'error');
  };

  return (
    <Bezel innerClassName="p-5 space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-extrabold text-ink-900">{title}</h2>
        <p className="text-sm leading-7 text-ink-600">{body}</p>
      </div>
      <div className="rounded-2xl bg-paper-2 px-4 py-3 text-sm text-ink-700 break-all text-left tabular" dir="ltr">
        {link}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button lead={<Copy className="w-4 h-4" />} onClick={() => copy(link, 'لینک کپی شد')}>
          کپی لینک
        </Button>
        <Button
          variant="secondary"
          lead={<Send className="w-4 h-4" />}
          onClick={() => copy(`سلام، برای ثبت سفارش این لینک را باز کنید:\n${link}`, 'پیام کپی شد. در دایرکت بچسبانید')}
        >
          پیام دایرکت
        </Button>
      </div>
      {onOpen && (
        <Button variant="quiet" block lead={<ExternalLink className="w-4 h-4" />} onClick={onOpen}>
          ببینید مشتری چه می‌بیند
        </Button>
      )}
    </Bezel>
  );
}
