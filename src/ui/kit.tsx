import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { asset } from '../lib/format';

const cx = (...c: unknown[]) => c.filter((x) => typeof x === 'string' && x).join(' ');
export { cx };

/* ---------- Brand ---------- */

export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src={asset('brand/mark-alpha.png')}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cx('select-none pointer-events-none', className)}
      draggable={false}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('font-black leading-none', className)} aria-label="سفارش‌یار">
      <span className="text-brand-800">سفارش‌</span>
      <span className="text-leaf-500">یار</span>
    </span>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing icon, rendered inside its own circular island */
  icon?: React.ReactNode;
  /** Leading icon, rendered inline */
  lead?: React.ReactNode;
  block?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[var(--shadow-brand)] hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none',
  secondary:
    'bg-white text-ink-900 ring-1 ring-ink-900/10 shadow-[var(--shadow-float)] hover:ring-ink-900/20 disabled:text-ink-400',
  ghost: 'bg-ink-900/[0.05] text-ink-900 hover:bg-ink-900/[0.09] disabled:text-ink-400',
  quiet: 'bg-transparent text-ink-600 hover:text-ink-900 hover:bg-ink-900/[0.04]',
  danger: 'bg-transparent text-rose-700 hover:bg-rose-50',
};

const SIZE: Record<ButtonSize, string> = {
  lg: 'h-14 text-base px-6',
  md: 'h-12 text-sm px-5',
  sm: 'h-10 text-xs px-4',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  lead,
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'group relative inline-flex items-center justify-center gap-2 rounded-full font-bold select-none disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        icon && 'pl-2',
        block && 'w-full',
        className
      )}
    >
      {lead}
      <span className={cx(icon && 'flex-1 text-center')}>{children}</span>
      {icon && (
        <span
          className={cx(
            'w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-x-0.5 group-hover:scale-105',
            variant === 'primary' ? 'bg-white/15' : 'bg-ink-900/[0.06]',
            size === 'sm' && 'w-7 h-7'
          )}
        >
          {icon}
        </span>
      )}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-ink-700 hover:bg-ink-900/[0.06]',
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Surfaces ---------- */

/** Double-bezel card: a quiet tray holding a white core with concentric radii. */
export function Bezel({
  className,
  innerClassName,
  children,
  as = 'div',
  ...rest
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
  as?: 'div' | 'button' | 'section' | 'article' | 'li';
} & React.HTMLAttributes<HTMLElement>) {
  const Tag = as as any;
  return (
    <Tag
      {...rest}
      className={cx(
        'block w-full text-right rounded-[1.75rem] bg-ink-900/[0.035] ring-1 ring-ink-900/[0.05] p-1.5',
        as === 'button' && 'hover:bg-ink-900/[0.06]',
        className
      )}
    >
      <div
        className={cx(
          'rounded-[calc(1.75rem-0.375rem)] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-float)]',
          innerClassName
        )}
      >
        {children}
      </div>
    </Tag>
  );
}

export function Eyebrow({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'leaf' | 'parcel' | 'ink' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-600/10',
    leaf: 'bg-leaf-50 text-leaf-700 ring-leaf-600/10',
    parcel: 'bg-parcel-50 text-parcel-700 ring-parcel-600/15',
    ink: 'bg-ink-900/[0.05] text-ink-700 ring-ink-900/5',
  };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1', tones[tone])}>
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: 'leaf' | 'parcel' | 'brand' | 'ink' }) {
  const c = { leaf: 'bg-leaf-500', parcel: 'bg-parcel-500', brand: 'bg-brand-500', ink: 'bg-ink-400' }[tone];
  return <span className={cx('inline-block w-2 h-2 rounded-full shrink-0', c)} aria-hidden="true" />;
}

/* ---------- Form fields ---------- */

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  suffix?: React.ReactNode;
  ltr?: boolean;
}

export function Field({ label, hint, error, suffix, ltr, className, ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-800">
        {label}
      </label>
      <div
        className={cx(
          'flex items-center rounded-2xl bg-white ring-1 shadow-[inset_0_1px_2px_rgba(22,38,79,0.04)] focus-within:ring-2',
          error ? 'ring-rose-300 focus-within:ring-rose-400' : 'ring-ink-900/10 focus-within:ring-brand-500'
        )}
      >
        <input
          id={id}
          dir={ltr ? 'ltr' : undefined}
          aria-invalid={Boolean(error)}
          {...rest}
          className={cx(
            'w-full h-13 min-h-12 bg-transparent px-4 text-base text-ink-900 placeholder:text-ink-400 outline-none',
            ltr && 'text-left tabular'
          )}
        />
        {suffix && <span className="pl-4 text-sm text-ink-500 shrink-0">{suffix}</span>}
      </div>
      {error ? (
        <p className="text-xs text-rose-700">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-800">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={Boolean(error)}
        {...rest}
        className={cx(
          'w-full rounded-2xl bg-white ring-1 px-4 py-3 text-base leading-7 text-ink-900 placeholder:text-ink-400 outline-none focus:ring-2 resize-none',
          error ? 'ring-rose-300 focus:ring-rose-400' : 'ring-ink-900/10 focus:ring-brand-500'
        )}
      />
      {error ? <p className="text-xs text-rose-700">{error}</p> : hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative w-12 h-7 rounded-full shrink-0', checked ? 'bg-leaf-500' : 'bg-ink-200')}
    >
      <span
        className={cx(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-500 ease-[var(--ease-spring)]',
          checked ? 'right-1' : 'right-6'
        )}
      />
    </button>
  );
}

/* ---------- Segmented tabs ---------- */

export function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cx(
              'h-10 shrink-0 rounded-full px-4 text-sm font-semibold flex items-center gap-2',
              active ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-900/10 hover:ring-ink-900/20'
            )}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span
                className={cx(
                  'min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center tabular',
                  active ? 'bg-white/15 text-white' : 'bg-ink-900/[0.06] text-ink-700'
                )}
              >
                {it.count.toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Bottom sheet ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[92dvh] flex flex-col bg-paper rounded-t-[2rem] shadow-[var(--shadow-lift)] animate-sheet outline-none"
      >
        <div className="pt-3 pb-2 flex justify-center" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-ink-900/15" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <div className="min-w-0 text-lg font-extrabold text-ink-900">{title}</div>
          <IconButton label="بستن" onClick={onClose} className="-ml-2">
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        {footer && (
          <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-ink-900/[0.06] bg-paper">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Quantity stepper ---------- */

export function QtyStepper({
  value,
  onChange,
  max = 99,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  if (value === 0) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(1)}
        className="h-11 px-5 rounded-full bg-brand-600 text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
      >
        افزودن
      </button>
    );
  }
  return (
    <div className="h-11 flex items-center gap-1 rounded-full bg-brand-50 ring-1 ring-brand-600/15 p-1">
      <button
        type="button"
        aria-label="یکی بیشتر"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-full bg-brand-600 text-white text-lg font-bold flex items-center justify-center disabled:opacity-40"
      >
        +
      </button>
      <span className="w-7 text-center text-base font-extrabold text-brand-800 tabular">{value.toLocaleString('fa-IR')}</span>
      <button
        type="button"
        aria-label="یکی کمتر"
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 rounded-full bg-white text-brand-800 text-lg font-bold flex items-center justify-center ring-1 ring-brand-600/15"
      >
        −
      </button>
    </div>
  );
}

/* ---------- Misc ---------- */

export function Stagger({ children, step = 70, className }: { children: React.ReactNode; step?: number; className?: string }) {
  return (
    <div className={className}>
      {React.Children.toArray(children).map((child, i) => (
        <div key={i} className="animate-rise" style={{ animationDelay: `${i * step}ms` }}>
          {child}
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="text-base font-extrabold text-ink-900">{children}</h2>
      {action}
    </div>
  );
}
