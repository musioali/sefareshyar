import { OrderItem, Product, ProductField } from '../types';

/** group label → chosen value, e.g. { سایز: 'M', رنگ: 'قرمز' } */
export type Options = Record<string, string>;

export interface CartLine {
  key: string;
  productId: string;
  options: Options;
  qty: number;
}

export const optionGroups = (p: Product): ProductField[] =>
  (p.fields || []).filter((f) => (f.type === 'select' || f.type === 'radio') && (f.options?.length || 0) > 0);

export const hasOptions = (p: Product) => optionGroups(p).length > 0;

export function unitPrice(p: Product, opts: Options): number {
  let price = p.base_price;
  for (const g of optionGroups(p)) {
    const chosen = g.options!.find((o) => o.label === opts[g.label]);
    if (chosen) price += chosen.price_delta || 0;
  }
  return price;
}

export function lineKey(productId: string, opts: Options): string {
  const parts = Object.keys(opts)
    .sort()
    .map((k) => `${k}=${opts[k]}`);
  return [productId, ...parts].join('|');
}

/** Add qty of one product+options to the cart, merging with an identical line. */
export function addLine(lines: CartLine[], productId: string, opts: Options, qty: number): CartLine[] {
  const key = lineKey(productId, opts);
  const found = lines.find((l) => l.key === key);
  if (found) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
  return [...lines, { key, productId, options: opts, qty }];
}

export function setLineQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  return qty <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, qty } : l));
}

export function toOrderItem(p: Product, line: CartLine): OrderItem {
  return {
    product_id: p.id,
    title: p.title,
    qty: line.qty,
    unit_price: unitPrice(p, line.options),
    options_selected: Object.keys(line.options).length ? line.options : undefined,
  };
}

/** Parse «S، M، L» or «S, M, L» into ['S','M','L'] */
export const splitValues = (text: string) =>
  text
    .split(/[,،\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
