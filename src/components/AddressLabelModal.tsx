import React, { useState } from 'react';
import { X, Copy, Check, Printer, PackageCheck, MapPin, Phone, User, Building2 } from 'lucide-react';
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

  const senderName = seller?.shop_name || 'فروشگاه آنلاین';
  const senderHandle = seller?.handle ? `@${seller.handle}` : '';
  const recipientName = order.ship_to.name || order.customer_name || 'مشتری گرامی';
  const recipientPhone = order.ship_to.phone || order.phone;
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
فرستنده: ${senderName} ${senderHandle}
گیرنده: ${recipientName}
شماره تماس گیرنده: ${recipientPhone}
استان و شهر: ${city}
آدرس دقیق: ${address}
کد پستی: ${postalCode}
${order.ship_to.is_gift ? '🎁 توجه: سفارش هدیه است (ارسال بدون فاکتور).' : ''}
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in label-print-modal-backdrop print:bg-transparent print:p-0 print:static"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] label-print-modal-container print:shadow-none print:w-full print:max-w-none print:p-0 print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Hidden when printing */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 print:hidden print-hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">برچسب ارسال پستی مرسوله</h3>
              <p className="text-xs text-stone-500">کد رهگیری داخلی: #{order.short_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Sheet - Optimally designed for printing */}
        <div className="mt-4 p-4 sm:p-5 bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl text-xs text-stone-800 space-y-3.5 select-all overflow-y-auto max-h-[55vh] shipping-printable-card print:border-2 print:border-black print:p-6 print:rounded-none print:m-0 print:max-h-none print:overflow-visible print:bg-white">
          {/* Header Bar */}
          <div className="flex justify-between items-center border-b border-stone-200 pb-2.5 text-xs text-stone-600 print:border-b-2 print:border-black">
            <div className="flex items-center gap-1.5 font-bold text-stone-800 text-sm">
              <Building2 className="w-4 h-4 text-stone-600 print:text-black" />
              <span>فرستنده: {senderName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-stone-200 px-2 py-0.5 rounded font-bold print:border print:border-black print:bg-transparent">
                سفارش: #{order.short_code}
              </span>
            </div>
          </div>

          {/* Recipient Details (High contrast and large font for courier) */}
          <div className="bg-white print:bg-white p-3.5 rounded-xl border border-stone-200/80 space-y-2 print:border-0 print:p-0">
            <div className="flex items-center gap-2 text-sm sm:text-base font-black text-stone-900 print:text-base">
              <User className="w-4 h-4 text-stone-500 print:hidden" />
              <span>گیرنده:</span>
              <span>{recipientName}</span>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-800 font-semibold">
              <Phone className="w-3.5 h-3.5 text-stone-500 print:hidden" />
              <span>شماره تماس:</span>
              <span className="font-mono text-stone-900" dir="ltr">{toPersianDigits(recipientPhone)}</span>
            </div>

            <div className="text-xs sm:text-sm text-stone-800 leading-relaxed pt-1">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5 print:hidden" />
                <div>
                  <span className="font-bold text-stone-900">نشانی پستی: </span>
                  <span className="text-stone-900">{city}، {address}</span>
                </div>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-stone-800 pt-0.5 flex items-center gap-2">
              <span className="font-bold text-stone-900">کد پستی ۱۰ رقمی:</span>
              <span className="font-mono font-bold text-stone-950 bg-stone-100 px-2 py-0.5 rounded print:bg-transparent print:border print:border-black">
                {toPersianDigits(postalCode)}
              </span>
            </div>

            {order.ship_to.is_gift && (
              <div className="mt-2 bg-pink-50 border border-pink-200 text-pink-800 px-3 py-1.5 rounded-lg text-xs font-bold print:border-black print:bg-transparent print:text-black">
                🎁 توجه ویژه: این سفارش هدیه است (بدون درج مبلغ و فاکتور ارسال شود).
              </div>
            )}
          </div>

          {/* Content Breakdown */}
          <div className="border-t border-stone-200 pt-2.5 text-xs text-stone-700 print:border-t print:border-black">
            <div className="font-bold text-stone-900 mb-1.5 text-xs">محتویات داخل بسته ({toPersianDigits(order.items.length)} ردیف):</div>
            <div className="space-y-1">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-stone-100 last:border-0 print:border-none">
                  <span className="text-stone-800 text-[11px] sm:text-xs">
                    • {it.title}
                    {it.fields_values && Object.keys(it.fields_values).length > 0 && (
                      <span className="text-stone-500 text-[10px] sm:text-[11px] mr-1">
                        ({Object.entries(it.fields_values).map(([k, v]) => `${k}: ${v}`).join('، ')})
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-stone-900 font-mono text-xs">
                    × {toPersianDigits(it.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons - STRICTLY HIDDEN ON PRINT */}
        <div className="mt-5 flex gap-2.5 pt-2 print:hidden print-hidden">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>متن برچسب کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>کپی متن جهت اشتراک</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white transition-all shadow-xs"
            title="چاپ روی کاغذ A4/A5 یا پرینتر حرارتی برچسب"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ برچسب</span>
          </button>
        </div>
      </div>
    </div>
  );
};
