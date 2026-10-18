import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Send } from 'lucide-react';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  phone: string;
  messageText: string;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  title = 'ارسال پیام به مشتری',
  phone,
  messageText,
}) => {
  const [copied, setCopied] = useState(false);
  const [editableText, setEditableText] = useState(messageText);

  // Sync if message changes
  React.useEffect(() => {
    setEditableText(messageText);
  }, [messageText]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(editableText);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = editableText;
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

  const handleSendSms = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedBody = encodeURIComponent(editableText);
    // iOS and Android SMS URI syntax
    const smsUrl = `sms:${cleanPhone}?&body=${encodedBody}`;
    window.location.href = smsUrl;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">{title}</h3>
              <p className="text-xs text-stone-500">شماره گیرنده: {phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex-1">
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            متن پیام (می‌توانید پیش از ارسال ویرایش کنید):
          </label>
          <textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            rows={5}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 pt-2">
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>کپی برای دایرکت</span>
              </>
            )}
          </button>

          <button
            onClick={handleSendSms}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span>ارسال پیامک (SMS)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
