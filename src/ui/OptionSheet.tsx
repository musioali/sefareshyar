import React, { useEffect, useState } from 'react';
import { Button, QtyStepper, Sheet, cx } from './kit';
import { Product } from '../types';
import { Options, optionGroups, unitPrice } from '../lib/items';
import { formatToman } from '../utils/persianUtils';
import { shortTitle } from '../lib/format';

/** Pick size, colour or any other option of one product, then a quantity. */
export function OptionSheet({
  product,
  onClose,
  onAdd,
  confirmLabel = 'افزودن به سبد',
}: {
  product: Product | null;
  onClose: () => void;
  onAdd: (opts: Options, qty: number) => void;
  confirmLabel?: string;
}) {
  const [opts, setOpts] = useState<Options>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setOpts({});
    setQty(1);
  }, [product?.id]);

  if (!product) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const groups = optionGroups(product);
  const missing = groups.filter((g) => !opts[g.label]);
  const price = unitPrice(product, opts);

  return (
    <Sheet
      open={Boolean(product)}
      onClose={onClose}
      title={shortTitle(product.title)}
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} />
            <span className="text-lg font-extrabold text-ink-900 tabular">{formatToman(price * qty)}</span>
          </div>
          <Button
            block
            size="lg"
            disabled={missing.length > 0}
            onClick={() => {
              onAdd(opts, qty);
              onClose();
            }}
          >
            {missing.length > 0 ? `${missing[0].label} را انتخاب کنید` : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {(product.image_b64_small || product.description) && (
          <div className="flex items-center gap-4">
            {product.image_b64_small && (
              <img src={product.image_b64_small} alt="" className="w-20 h-20 rounded-2xl object-cover ring-1 ring-ink-900/10" />
            )}
            {product.description && <p className="text-sm leading-7 text-ink-600">{product.description}</p>}
          </div>
        )}
        {groups.map((g) => (
          <fieldset key={g.key} className="space-y-3">
            <legend className="text-sm font-bold text-ink-900 mb-3">{g.label}</legend>
            <div className="flex flex-wrap gap-2">
              {g.options!.map((o) => {
                const active = opts[g.label] === o.label;
                return (
                  <button
                    key={o.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setOpts((prev) => ({ ...prev, [g.label]: o.label }))}
                    className={cx(
                      'min-h-11 px-4 rounded-full text-sm font-semibold',
                      active ? 'bg-ink-900 text-white' : 'bg-white text-ink-800 ring-1 ring-ink-900/10 hover:ring-ink-900/25'
                    )}
                  >
                    {o.label}
                    {o.price_delta ? <span className="mr-1 text-xs opacity-75">+{formatToman(o.price_delta)}</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}
