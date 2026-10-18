import React, { useState } from 'react';
import { X, Copy, Check, Printer, PackageCheck } from 'lucide-react';
import { Order, Seller } from '../types';
import { toPersianDigits } from '../utils/persianUtils';

interface AddressLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  seller: Seller | null;
}

export const AddressLabelModal: React.FC<AddressLabelModalProps> = ({
  isOpen,
  onClose,
  order,
  seller,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const senderName = seller?.shop_name || 'فروشگاه اینستاگرامی';
  const recipientName = order.ship_to.name;
  const recipientPhone = order.ship_to.phone;
  const city = order.ship_to.city;
  const address = order.ship_to.address;
  const postalCode = order.ship_to.postal_code || '---';

  const itemsList = order.items
    .map((it) => {
      let details = `${toPersianDigits(it.qty)} عدد ${it.title}`;
      if (it.fields_values) {
        const extra = Object.entries(it.fields_values)
          .map(([k, v]) => `${k}: ${v}`)
          .join('، ');
        if (extra) details += ` (${extra})`;
      }
      return details;
    })
    .join('\n');

  const formattedLabel = `📦 برچسب ارسال پستی (سفارش ${order.short_code})
--------------------------------------
فرستنده: ${senderName}
گیرنده: ${recipientName}
شماره تماس گیرنده: ${recipientPhone}
استان و شهر: ${city}
آدرس دقیق: ${address}
کد پستی: ${postalCode}
${order.ship_to.is_gift ? '🎁 توجه: سفارش هدیه است.' : ''}
--------------------------------------
محتویات مرسوله:
${itemsList}
`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedLabel);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedLabel;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">برچسب آدرس پستی</h3>
              <p className="text-xs text-stone-500">کد سفارش: {order.short_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic printable label look */}
        <div className="mt-4 p-4 bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl font-mono text-xs text-stone-800 space-y-2 select-all overflow-y-auto max-h-[50vh]">
          <div className="flex justify-between border-b pb-2 text-[11px] font-sans text-stone-500 font-bold">
            <span>فرستنده: {senderName}</span>
            <span className="font-mono text-amber-800">#{order.short_code}</span>
          </div>

          <div className="space-y-1.5 py-1 font-sans">
            <div className="text-sm font-black text-stone-900">
              گیرنده: {recipientName}
            </div>
            <div className="text-stone-700">تلفن: {toPersianDigits(recipientPhone)}</div>
            <div className="text-stone-800 leading-relaxed">
              <span className="font-bold">آدرس:</span> {city}، {address}
            </div>
            <div className="text-stone-700">
              <span className="font-bold">کد پستی:</span> {toPersianDigits(postalCode)}
            </div>
            {order.ship_to.is_gift && (
              <div className="inline-block bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-[11px] font-bold">
                🎁 سفارش هدیه است (بدون فاکتور ارسال شود)
              </div>
            )}
          </div>

          <div className="border-t pt-2 text-[11px] text-stone-600 font-sans">
            <div className="font-bold text-stone-800 mb-1">اقلام داخل بسته:</div>
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between py-0.5">
                <span>• {it.title}</span>
                <span className="font-bold">× {toPersianDigits(it.qty)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2 pt-2">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>برچسب کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>کپی متن برچسب برای چاپ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
