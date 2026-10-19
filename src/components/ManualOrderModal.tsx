import React, { useState, useEffect } from 'react';
import { X, UserCheck, Plus, Minus, CheckCircle, ShoppingBag } from 'lucide-react';
import { Product, Order, Customer, OrderItem } from '../types';
import { dataService } from '../services/dataService';
import {
  formatToman,
  normalizePhone,
  isValidIranPhone,
  toPersianDigits,
} from '../utils/persianUtils';

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  products: Product[];
  onOrderCreated: (order: Order) => void;
}

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  products,
  onOrderCreated,
}) => {
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [autoMatchedCustomer, setAutoMatchedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setCustomerName('');
      setCity('');
      setAddress('');
      setPostalCode('');
      setIsGift(false);
      setRecipientName('');
      setRecipientPhone('');
      setItemQuantities({});
      setAutoMatchedCustomer(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  // Phone lookup for existing customer
  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    const norm = normalizePhone(val);
    if (norm.length >= 10) {
      try {
        const found = await dataService.getCustomerByPhone(sellerId, norm);
        if (found) {
          setAutoMatchedCustomer(found);
          if (!customerName) setCustomerName(found.full_name);
          if (found.default_address) {
            if (!city) setCity(found.default_address.city);
            if (!address) setAddress(found.default_address.text);
            if (!postalCode && found.default_address.postal_code) {
              setPostalCode(found.default_address.postal_code);
            }
          }
        } else {
          setAutoMatchedCustomer(null);
        }
      } catch {
        // ignore
      }
    } else {
      setAutoMatchedCustomer(null);
    }
  };

  const handleQtyChange = (prodId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[prodId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [prodId]: next };
    });
  };

  if (!isOpen) return null;

  // Calculate totals
  let subtotal = 0;
  let totalCount = 0;
  const selectedItems: OrderItem[] = [];

  for (const prod of products) {
    const qty = itemQuantities[prod.id] || 0;
    if (qty > 0) {
      totalCount += qty;
      subtotal += prod.base_price * qty;
      selectedItems.push({
        product_id: prod.id,
        title: prod.title,
        qty,
        unit_price: prod.base_price,
      });
    }
  }

  const shippingCost = totalCount >= 3 ? 0 : 45000;
  const totalAmount = subtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidIranPhone(phone)) {
      setErrorMsg('شماره موبایل وارد شده معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹)');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('لطفاً نام مشتری را وارد کنید');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('لطفاً آدرس ارسال را وارد کنید');
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMsg('حداقل یک محصول انتخاب کنید');
      return;
    }

    setIsSubmitting(true);
    try {
      const { order } = await dataService.createOrder({
        seller_id: sellerId,
        customer_name: customerName.trim(),
        phone: normalizePhone(phone),
        items: selectedItems,
        subtotal,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        deposit_required: totalAmount,
        deposit_paid_claimed: totalAmount,
        ship_to: {
          name: isGift && recipientName ? recipientName.trim() : customerName.trim(),
          phone: isGift && recipientPhone ? normalizePhone(recipientPhone) : normalizePhone(phone),
          city: city.trim() || 'تهران',
          address: address.trim(),
          postal_code: postalCode.trim(),
          is_gift: isGift,
        },
        status: 'confirmed', // Direct manual orders usually already verified in chat
      });

      onOrderCreated(order);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت سفارش');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">ثبت سریع سفارش دستی</h3>
              <p className="text-xs text-stone-500">برای سفارش‌هایی که مشتری در دایرکت پیام داده</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Customer info */}
          <div className="space-y-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                شماره موبایل مشتری:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-left font-mono"
                dir="ltr"
              />
              {autoMatchedCustomer && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    مشتری قدیمی شناسایی شد: {autoMatchedCustomer.full_name} ({toPersianDigits(autoMatchedCustomer.orders_count)} خرید قبلی)
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: مریم احمدی"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">شهر:</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: تهران"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">آدرس کامل (قابلیت Paste):</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="خیابان، کوچه، پلاک، واحد..."
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">کد پستی (اختیاری):</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="۱۰ رقم"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Product selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-800">
              انتخاب محصولات سفارش:
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {products.map((prod) => {
                const qty = itemQuantities[prod.id] || 0;
                return (
                  <div
                    key={prod.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      qty > 0 ? 'bg-brand-50/70 border-brand-300' : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="text-xs font-semibold text-stone-900 line-clamp-1">
                        {prod.title}
                      </div>
                      <div className="text-xs text-stone-500">
                        {formatToman(prod.base_price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(prod.id, -1)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold"
                        disabled={qty <= 0}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold">
                        {toPersianDigits(qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(prod.id, 1)}
                        className="w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {selectedItems.length > 0 && (
            <div className="p-3 bg-stone-100 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>جمع کل کالاها ({toPersianDigits(totalCount)} عدد):</span>
                <span>{formatToman(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>هزینه ارسال:</span>
                <span>{shippingCost === 0 ? 'رایگان 🎁' : formatToman(shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-1 text-sm">
                <span>مبلغ نهایی:</span>
                <span className="text-brand-800">{formatToman(totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="flex-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت مستقیم در صف تولید'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
