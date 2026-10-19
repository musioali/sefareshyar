/**
 * SefareshYar Data Service Layer
 * 
 * In accordance with PRD Section 0, 5, 6, 7 & 10:
 * - Single point of data access (no direct external DB calls outside this layer).
 * - Implements strict state machine transitions.
 * - Works offline with LocalStorage persistence and fallback in-memory cache.
 * - Logs deterministic telemetry events.
 * - Enforces zero information leakage (customer hints reveal only first_name, city, last_product_title).
 */

import {
  Seller,
  PublicShop,
  Product,
  Customer,
  CustomerHint,
  Order,
  PublicStatus,
  OrderStatus,
  CarrierType,
  EventType,
  AppEvent,
  OrderFile,
  Material,
} from '../types';
import { sampleReceiptDataUrl } from '../lib/receipt';
import { formatToJalaliText } from '../utils/dateUtils';
import {
  hashCustomerIdentifier,
  generateShortCode,
  generateRandomToken,
  normalizePhone,
} from '../utils/persianUtils';

const STORAGE_KEYS = {
  SELLERS: 'sefareshyar_sellers_v5',
  PRODUCTS: 'sefareshyar_products_v5',
  CUSTOMERS: 'sefareshyar_customers_v5',
  ORDERS: 'sefareshyar_orders_v5',
  PUBLIC_STATUS: 'sefareshyar_public_status_v5',
  EVENTS: 'sefareshyar_events_v5',
  MATERIALS: 'sefareshyar_materials_v5',
  CURRENT_SELLER_ID: 'sefareshyar_current_seller_id_v5',
  ONBOARDED: 'sefareshyar_onboarded_v5',
};

// Safe LocalStorage helpers
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`LocalStorage quota exceeded or unavailable for key: ${key}`, err);
    return false;
  }
}

/** «تی‌شرت (M، قرمز)»: the product name with the options the customer picked */
export function itemLabel(item: { title: string; options_selected?: Record<string, any> }): string {
  const values = Object.values(item.options_selected || {}).filter(Boolean);
  return values.length ? `${item.title} (${values.join('، ')})` : item.title;
}

// Initial Seed Data directly matching PRD Section 16
function getInitialSeedData() {
  const sellers: Record<string, Seller> = {
    seller_nora: {
      sellerId: 'seller_nora',
      shop_name: 'شمع دست‌ساز نورا',
      handle: 'nora_candle',
      card_number: '6037991823456789',
      card_holder_name: 'نورا رضایی',
      business_type: 'fixed',
      shipping_default_cost: 95000,
      free_shipping_min_items: 3,
      deposit_percent_default: 100,
      is_accepting_orders: true,
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
  };

  const products: Record<string, Product[]> = {
    seller_nora: [
      {
        id: 'prod_candle_small',
        title: 'شمع معطر شیشه‌ای کوچک',
        image_b64_small: '',
        available: true,
        min_lead_days: 2,
        pricing_mode: 'fixed',
        base_price: 260000,
        fields: [
          {
            key: 'scent',
            label: 'رایحه',
            type: 'select',
            required: true,
            options: [
              { label: 'دارچین', price_delta: 0 },
              { label: 'وانیل', price_delta: 0 },
              { label: 'یاس', price_delta: 0 },
            ],
          },
        ],
        template: null,
        recipe: [
          { material_id: 'mat_soy_wax', qty: 200 },
          { material_id: 'mat_jar_small', qty: 1 },
          { material_id: 'mat_wick', qty: 1 },
          { material_id: 'mat_fragrance', qty: 15 },
        ],
        packaging_cost: 43000,
        reorder_cycle_days: 30,
        description: '۲۰۰ گرم موم سویا، یک فتیله',
        unit_cost: 272000,
      },
      {
        id: 'prod_candle_large',
        title: 'شمع معطر دست‌ساز بزرگ',
        image_b64_small: '',
        available: true,
        min_lead_days: 3,
        pricing_mode: 'fixed',
        base_price: 420000,
        fields: [
          {
            key: 'scent',
            label: 'رایحه',
            type: 'select',
            required: true,
            options: [
              { label: 'دارچین', price_delta: 0 },
              { label: 'وانیل', price_delta: 0 },
              { label: 'یاس', price_delta: 0 },
            ],
          },
        ],
        template: null,
        recipe: [
          { material_id: 'mat_soy_wax', qty: 400 },
          { material_id: 'mat_jar_large', qty: 1 },
          { material_id: 'mat_wick', qty: 2 },
          { material_id: 'mat_fragrance', qty: 30 },
        ],
        packaging_cost: 48000,
        reorder_cycle_days: 45,
        description: '۴۰۰ گرم موم سویا، دو فتیله',
        unit_cost: 461000,
      },
      {
        id: 'prod_gift_set',
        title: 'ست هدیه دوتایی',
        image_b64_small: '',
        available: true,
        min_lead_days: 3,
        pricing_mode: 'fixed',
        base_price: 490000,
        fields: [],
        template: null,
        recipe: [
          { material_id: 'mat_soy_wax', qty: 400 },
          { material_id: 'mat_jar_small', qty: 2 },
          { material_id: 'mat_wick', qty: 2 },
          { material_id: 'mat_fragrance', qty: 30 },
        ],
        packaging_cost: 58000,
        description: 'دو شمع کوچک در جعبهٔ هدیه',
        unit_cost: 516000,
      },
    ],
  };

  const now = new Date();
  const ago = (hours: number) => new Date(now.getTime() - hours * 3600 * 1000).toISOString();
  const SMALL = 'شمع معطر شیشه‌ای کوچک';
  const LARGE = 'شمع معطر دست‌ساز بزرگ';
  const GIFT = 'ست هدیه دوتایی';

  const customers: Record<string, Customer[]> = {
    seller_nora: [
      {
        customerId: 'cust_maryam',
        phone: '09123456789',
        full_name: 'مریم احمدی',
        instagram_id: 'maryam_ahmadii',
        default_address: {
          city: 'تهران',
          text: 'سعادت‌آباد، خیابان صرافها، کوچه ۳۵، پلاک ۱۲، واحد ۴',
          postal_code: '1998877665',
        },
        orders_count: 3,
        last_order_at: ago(0.2),
        last_product_title: SMALL,
      },
      {
        customerId: 'cust_fereshteh',
        phone: '09125550142',
        full_name: 'فرشته رضایی',
        default_address: { city: 'کرج', text: 'عظیمیه، بلوار استقلال، پلاک ۹', postal_code: '3156789012' },
        orders_count: 3,
        last_order_at: ago(42 * 24),
        last_product_title: LARGE,
      },
      {
        customerId: 'cust_leila',
        phone: '09125550177',
        full_name: 'لیلا کریمی',
        default_address: { city: 'رشت', text: 'گلسار، بلوار سمیه، کوچه ۱۲، پلاک ۳', postal_code: '4185743210' },
        orders_count: 2,
        last_order_at: ago(31 * 24),
        last_product_title: SMALL,
      },
      {
        customerId: 'cust_samaneh',
        phone: '09125550163',
        full_name: 'سمانه نوری',
        default_address: { city: 'شیراز', text: 'معالی‌آباد، کوچه ۱۴، پلاک ۲۲', postal_code: '7187654321' },
        orders_count: 1,
        last_order_at: ago(43 * 24),
        last_product_title: LARGE,
      },
      {
        customerId: 'cust_tina',
        phone: '09125550101',
        full_name: 'تینا امینی',
        default_address: { city: 'تهران', text: 'پونک، خیابان میرزابابایی، کوچه ۴، پلاک ۷', postal_code: '1469876543' },
        orders_count: 1,
        last_order_at: ago(0.7),
        last_product_title: SMALL,
      },
      {
        customerId: 'cust_zahra',
        phone: '09197654321',
        full_name: 'زهرا کاظمی',
        default_address: { city: 'اصفهان', text: 'خیابان نظر شرقی، مجتمع مروارید، طبقه ۳', postal_code: '8174567890' },
        orders_count: 1,
        last_order_at: ago(4),
        last_product_title: LARGE,
      },
      {
        customerId: 'cust_ali',
        phone: '09121112233',
        full_name: 'علی فلاح',
        orders_count: 1,
        last_order_at: ago(24),
        last_product_title: SMALL,
      },
      {
        customerId: 'cust_hoda',
        phone: '09124445566',
        full_name: 'هدی خلیلی',
        default_address: { city: 'کرج', text: 'گوهردشت، فاز ۲، خیابان نهم غربی، پلاک ۴', postal_code: '3145678901' },
        orders_count: 1,
        last_order_at: ago(48),
        last_product_title: GIFT,
      },
    ],
  };

  // Seed sample orders for tests
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const orders: Order[] = [
    {
      orderId: 'ord_sample_submitted',
      short_code: 'N4K7P',
      seller_id: 'seller_nora',
      customer_id: 'cust_tina',
      customer_name: 'تینا امینی',
      phone: '09125550101',
      items: [
        {
          product_id: 'prod_candle_small',
          title: 'شمع معطر شیشه‌ای کوچک',
          qty: 2,
          unit_price: 260000,
        },
      ],
      subtotal: 520000,
      shipping_cost: 95000,
      discount: 0,
      total_amount: 615000,
      deposit_required: 615000,
      deposit_paid_claimed: 615000,
      paid_at_claimed: '۱۴:۳۲',
      ship_to: {
        name: 'تینا امینی',
        phone: '09125550101',
        city: 'تهران',
        address: 'پونک، خیابان میرزابابایی، کوچه ۴، پلاک ۷',
        postal_code: '1469876543',
        is_gift: false,
      },
      delivery_due_date: twoDaysLater,
      flags: {
        low_quality_photo: false,
        price_mismatch: false,
      },
      status: 'submitted',
      status_history: [
        { status: 'submitted', at: new Date(now.getTime() - 40 * 60 * 1000).toISOString() },
      ],
      files: [{ kind: 'receipt', data_b64: sampleReceiptDataUrl(615000, 'نورا رضایی', '14:32'), width: 600, height: 840 }],
      created_at: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
          },
    {
      orderId: 'ord_sample_returning',
      short_code: 'M7R2D',
      seller_id: 'seller_nora',
      customer_id: 'cust_maryam',
      customer_name: 'مریم احمدی',
      phone: '09123456789',
      instagram_id: 'maryam_ahmadii',
      items: [
        {
          product_id: 'prod_candle_small',
          title: SMALL,
          qty: 2,
          unit_price: 260000,
        },
      ],
      subtotal: 520000,
      shipping_cost: 95000,
      discount: 0,
      total_amount: 615000,
      deposit_required: 615000,
      deposit_paid_claimed: 615000,
      paid_at_claimed: '۲۰:۴۱',
      ship_to: {
        name: 'مریم احمدی',
        phone: '09123456789',
        city: 'تهران',
        address: 'سعادت‌آباد، خیابان صرافها، کوچه ۳۵، پلاک ۱۲، واحد ۴',
        postal_code: '1998877665',
        is_gift: false,
      },
      delivery_due_date: twoDaysLater,
      flags: {},
      status: 'submitted',
      status_history: [{ status: 'submitted', at: ago(0.2) }],
      files: [{ kind: 'receipt', data_b64: sampleReceiptDataUrl(615000, 'نورا رضایی', '20:41'), width: 600, height: 840 }],
      created_at: ago(0.2),
    },
    {
      orderId: 'ord_sample_urgent_confirmed',
      short_code: 'K9M2X',
      seller_id: 'seller_nora',
      customer_id: 'cust_zahra',
      customer_name: 'زهرا کاظمی',
      phone: '09197654321',
      items: [
        {
          product_id: 'prod_candle_large',
          title: 'شمع معطر دست‌ساز بزرگ',
          qty: 1,
          unit_price: 420000,
        },
        {
          product_id: 'prod_gift_set',
          title: 'ست هدیه دوتایی',
          qty: 2,
          unit_price: 490000,
        },
      ],
      subtotal: 1400000,
      shipping_cost: 0, // Free shipping triggered (qty = 3 >= free_shipping_min_items)
      discount: 0,
      total_amount: 1400000,
      deposit_required: 1400000,
      deposit_paid_claimed: 1400000,
      ship_to: {
        name: 'زهرا کاظمی',
        phone: '09197654321',
        city: 'اصفهان',
        address: 'خیابان نظر شرقی، مجتمع مروارید، طبقه ۳',
        postal_code: '8174567890',
        is_gift: false,
      },
      delivery_due_date: twoDaysLater,
      flags: {},
      status: 'confirmed',
      status_history: [
        { status: 'submitted', at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString() },
        { status: 'confirmed', at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString() },
      ],
      files: [{ kind: 'receipt', data_b64: sampleReceiptDataUrl(1400000, 'نورا رضایی', '14:32'), width: 600, height: 840 }],
      created_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
    },
    {
      orderId: 'ord_sample_packed',
      short_code: 'R3T8V',
      seller_id: 'seller_nora',
      customer_id: 'cust_ali',
      customer_name: 'علی فلاح',
      phone: '09121112233',
      items: [
        {
          product_id: 'prod_candle_small',
          title: 'شمع معطر شیشه‌ای کوچک',
          qty: 3,
          unit_price: 260000,
        },
      ],
      subtotal: 780000,
      shipping_cost: 0,
      discount: 0,
      total_amount: 780000,
      deposit_required: 780000,
      deposit_paid_claimed: 780000,
      ship_to: {
        name: 'نگین حبیبی (هدیه از علی فلاح)',
        phone: '09369998877',
        city: 'مشهد',
        address: 'بلوار سجاد، خیابان بهار، پلاک ۲۸',
        postal_code: '9187654321',
        is_gift: true,
      },
      delivery_due_date: fiveDaysLater,
      flags: {},
      status: 'packed',
      status_history: [
        { status: 'submitted', at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString() },
        { status: 'confirmed', at: new Date(now.getTime() - 20 * 3600 * 1000).toISOString() },
        { status: 'in_production', at: new Date(now.getTime() - 8 * 3600 * 1000).toISOString() },
        { status: 'packed', at: new Date(now.getTime() - 1 * 3600 * 1000).toISOString() },
      ],
      files: [{ kind: 'receipt', data_b64: sampleReceiptDataUrl(780000, 'نورا رضایی', '14:32'), width: 600, height: 840 }],
      created_at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    },
    {
      orderId: 'ord_sample_shipped',
      short_code: 'P5L9Q',
      seller_id: 'seller_nora',
      customer_id: 'cust_hoda',
      customer_name: 'هدی خلیلی',
      phone: '09124445566',
      items: [
        {
          product_id: 'prod_gift_set',
          title: 'ست هدیه دوتایی',
          qty: 1,
          unit_price: 490000,
        },
      ],
      subtotal: 490000,
      shipping_cost: 95000,
      discount: 0,
      total_amount: 585000,
      deposit_required: 585000,
      deposit_paid_claimed: 585000,
      ship_to: {
        name: 'هدی خلیلی',
        phone: '09124445566',
        city: 'کرج',
        address: 'گوهردشت، فاز ۲، خیابان نهم غربی، پلاک ۴',
        postal_code: '3145678901',
        is_gift: false,
      },
      carrier: 'post',
      tracking_code: '12345678901234567890', // 20 digits valid Post code
      flags: {},
      status: 'shipped',
      status_history: [
        { status: 'submitted', at: new Date(now.getTime() - 48 * 3600 * 1000).toISOString() },
        { status: 'confirmed', at: new Date(now.getTime() - 40 * 3600 * 1000).toISOString() },
        { status: 'in_production', at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString() },
        { status: 'packed', at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString() },
        { status: 'shipped', at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString() },
      ],
      files: [{ kind: 'receipt', data_b64: sampleReceiptDataUrl(585000, 'نورا رضایی', '14:32'), width: 600, height: 840 }],
      created_at: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
    },
  ];

  const publicStatuses: Record<string, PublicStatus> = {};
  for (const ord of orders) {
    const seller = sellers[ord.seller_id];
    let trackingUrl: string | undefined;
    if (ord.carrier === 'post' && ord.tracking_code) {
      trackingUrl = `https://tracking.post.ir/?id=${ord.tracking_code}`;
    }
    publicStatuses[ord.orderId] = {
      order_id: ord.orderId,
      seller_id: ord.seller_id,
      shop_name: seller ? seller.shop_name : 'فروشگاه',
      short_code: ord.short_code,
      status: ord.status,
      items_summary: ord.items.map((it) => `${it.qty} × ${it.title}`).join('، '),
      total_amount: ord.total_amount,
      deposit_required: ord.deposit_required,
      deposit_paid_claimed: ord.deposit_paid_claimed,
      eta_text: ord.delivery_due_date ? 'تخمین آماده‌سازی: ۲ الی ۳ روز کاری' : undefined,
      carrier: ord.carrier,
      tracking_code: ord.tracking_code,
      tracking_url: trackingUrl,
      updated_at: ord.created_at,
      card_number: seller?.card_number,
      card_holder_name: seller?.card_holder_name,
    };
  }

  const materials: Record<string, Material[]> = {
    seller_nora: [
      { id: 'mat_soy_wax', name: 'موم سویای طبیعی', unit: 'g', purchase_price: 3000000, purchase_qty: 5000, cost_per_unit: 600 },
      { id: 'mat_jar_small', name: 'شیشه درب‌دار کوچک', unit: 'pcs', purchase_price: 1560000, purchase_qty: 24, cost_per_unit: 65000 },
      { id: 'mat_jar_large', name: 'شیشه درب‌دار بزرگ', unit: 'pcs', purchase_price: 1020000, purchase_qty: 12, cost_per_unit: 85000 },
      { id: 'mat_wick', name: 'فتیله چوبی وارداتی', unit: 'pcs', purchase_price: 8000, purchase_qty: 1, cost_per_unit: 8000 },
      { id: 'mat_fragrance', name: 'اسانس روغنی فرانسوی', unit: 'ml', purchase_price: 2400000, purchase_qty: 1000, cost_per_unit: 2400 },
      { id: 'mat_box_small', name: 'جعبه هاردباکس و برچسب', unit: 'pcs', purchase_price: 25000, purchase_qty: 1, cost_per_unit: 25000 },
      { id: 'mat_carton', name: 'کارتن پستی محکم', unit: 'pcs', purchase_price: 18000, purchase_qty: 1, cost_per_unit: 18000 },
    ],
  };

  return { sellers, products, customers, orders, publicStatuses, materials };
}

// In-Memory cache for speed and consistency
class DataService {
  private sellers: Record<string, Seller>;
  private products: Record<string, Product[]>;
  private customers: Record<string, Customer[]>;
  private orders: Order[];
  private publicStatuses: Record<string, PublicStatus>;
  private events: AppEvent[];
  private materials: Record<string, Material[]>;
  private currentSellerId: string;

  constructor() {
    const rawSellers = getStored<Record<string, Seller> | null>(STORAGE_KEYS.SELLERS, null);
    if (!rawSellers) {
      const seed = getInitialSeedData();
      this.sellers = seed.sellers;
      this.products = seed.products;
      this.customers = seed.customers;
      this.orders = seed.orders;
      this.publicStatuses = seed.publicStatuses;
      this.events = [];
      this.materials = seed.materials;
      this.currentSellerId = 'seller_nora';
      this.persistAll();
    } else {
      this.sellers = rawSellers;
      this.products = getStored(STORAGE_KEYS.PRODUCTS, {});
      this.customers = getStored(STORAGE_KEYS.CUSTOMERS, {});
      this.orders = getStored(STORAGE_KEYS.ORDERS, []);
      this.publicStatuses = getStored(STORAGE_KEYS.PUBLIC_STATUS, {});
      this.events = getStored(STORAGE_KEYS.EVENTS, []);
      this.materials = getStored(STORAGE_KEYS.MATERIALS, getInitialSeedData().materials);
      this.currentSellerId = getStored(STORAGE_KEYS.CURRENT_SELLER_ID, '');
    }
  }

  private persistAll() {
    setStored(STORAGE_KEYS.SELLERS, this.sellers);
    setStored(STORAGE_KEYS.PRODUCTS, this.products);
    setStored(STORAGE_KEYS.CUSTOMERS, this.customers);
    setStored(STORAGE_KEYS.ORDERS, this.orders);
    setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
    setStored(STORAGE_KEYS.EVENTS, this.events);
    setStored(STORAGE_KEYS.MATERIALS, this.materials);
    setStored(STORAGE_KEYS.CURRENT_SELLER_ID, this.currentSellerId);
  }

  // --- Auth & Session ---
  getCustomSellers(): Seller[] {
    return Object.values(this.sellers).filter((s) => !this.isDemoSeller(s.sellerId));
  }

  getCurrentSellerId(): string {
    // Respect an explicit choice (including the demo shop); fall back to the user's own shop first
    if (this.currentSellerId && this.sellers[this.currentSellerId]) {
      return this.currentSellerId;
    }
    const custom = this.getCustomSellers();
    const fallback = custom[0]?.sellerId || (this.sellers['seller_nora'] ? 'seller_nora' : Object.keys(this.sellers)[0] || '');
    this.currentSellerId = fallback;
    setStored(STORAGE_KEYS.CURRENT_SELLER_ID, fallback);
    return fallback;
  }

  /** Put the sample shop back to its first state without touching the user's own shops. */
  async resetSampleShop(): Promise<void> {
    const seed = getInitialSeedData();
    const id = 'seller_nora';
    for (const o of this.orders) {
      if (o.seller_id === id) delete this.publicStatuses[o.orderId];
    }
    this.sellers[id] = seed.sellers[id];
    this.products[id] = seed.products[id];
    this.customers[id] = seed.customers[id];
    this.materials[id] = seed.materials[id];
    this.orders = [...seed.orders, ...this.orders.filter((o) => o.seller_id !== id)];
    Object.assign(this.publicStatuses, seed.publicStatuses);
    this.persistAll();
  }

  async ensureSampleShop(): Promise<void> {
    if (!this.sellers['seller_nora']) await this.resetSampleShop();
  }

  /** Re-read everything from storage, so a tab sees orders placed from another tab. */
  syncFromStorage(): void {
    const rawSellers = getStored<Record<string, Seller> | null>(STORAGE_KEYS.SELLERS, null);
    if (!rawSellers) return;
    this.sellers = rawSellers;
    this.products = getStored(STORAGE_KEYS.PRODUCTS, this.products);
    this.customers = getStored(STORAGE_KEYS.CUSTOMERS, this.customers);
    this.orders = getStored(STORAGE_KEYS.ORDERS, this.orders);
    this.publicStatuses = getStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
    this.events = getStored(STORAGE_KEYS.EVENTS, this.events);
  }

  // First-run flag for the seller app: false until the owner creates, opens or logs into a shop
  isOnboarded(): boolean {
    return getStored<boolean>(STORAGE_KEYS.ONBOARDED, false);
  }

  markOnboarded(): void {
    setStored(STORAGE_KEYS.ONBOARDED, true);
  }

  setCurrentSellerId(sellerId: string): void {
    this.currentSellerId = sellerId;
    setStored(STORAGE_KEYS.CURRENT_SELLER_ID, sellerId);
  }

  async getSellerById(sellerId: string): Promise<Seller | null> {
    const seller = this.sellers[sellerId];
    if (!seller) return null;
    return {
      ...seller,
      products: this.products[sellerId] || [],
    };
  }

  async getSellerByHandle(handle: string): Promise<PublicShop | null> {
    const clean = handle.trim().toLowerCase();
    const seller = Object.values(this.sellers).find(
      (s) => s.handle.toLowerCase() === clean
    );
    if (!seller) return null;
    const prods = (this.products[seller.sellerId] || []).filter((p) => p.available);
    return {
      seller_id: seller.sellerId,
      shop_name: seller.shop_name,
      handle: seller.handle,
      business_type: seller.business_type,
      card_number: seller.card_number,
      card_holder_name: seller.card_holder_name,
      shipping_default_cost: seller.shipping_default_cost,
      free_shipping_min_items: seller.free_shipping_min_items,
      deposit_percent_default: seller.deposit_percent_default,
      is_accepting_orders: seller.is_accepting_orders,
      products: this.products[seller.sellerId] || [], // include all to show unavailable with badge
    };
  }

  async checkHandleAvailable(handle: string, excludeSellerId?: string): Promise<boolean> {
    const clean = handle.trim().toLowerCase();
    const match = Object.values(this.sellers).find(
      (s) => s.handle.toLowerCase() === clean && s.sellerId !== excludeSellerId
    );
    return !match;
  }

  async saveSeller(seller: Seller): Promise<Seller> {
    this.sellers[seller.sellerId] = { ...seller };
    this.currentSellerId = seller.sellerId;
    setStored(STORAGE_KEYS.SELLERS, this.sellers);
    setStored(STORAGE_KEYS.CURRENT_SELLER_ID, seller.sellerId);
    return seller;
  }

  // --- Products ---
  async listProducts(sellerId: string): Promise<Product[]> {
    return this.products[sellerId] || [];
  }

  async saveProduct(sellerId: string, product: Product): Promise<Product> {
    if (!this.products[sellerId]) {
      this.products[sellerId] = [];
    }
    const idx = this.products[sellerId].findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.products[sellerId][idx] = product;
    } else {
      this.products[sellerId].push(product);
    }
    setStored(STORAGE_KEYS.PRODUCTS, this.products);
    return product;
  }

  async deleteProduct(sellerId: string, productId: string): Promise<void> {
    if (this.products[sellerId]) {
      this.products[sellerId] = this.products[sellerId].filter((p) => p.id !== productId);
      setStored(STORAGE_KEYS.PRODUCTS, this.products);
    }
  }

  // --- Customers & Hints (PRD Section 6: Zero Info Leakage) ---
  async getCustomerHint(sellerId: string, phone: string): Promise<CustomerHint | null> {
    const normalizedPhone = normalizePhone(phone);
    const sellerCustomers = this.customers[sellerId] || [];
    const customer = sellerCustomers.find((c) => normalizePhone(c.phone) === normalizedPhone);
    if (!customer) return null;

    const firstName = customer.full_name.trim().split(' ')[0] || customer.full_name;
    const hasAddress = Boolean(customer.default_address?.text);
    return {
      first_name: firstName,
      city: customer.default_address?.city || '',
      last_product_title: customer.last_product_title || '',
      has_address: hasAddress,
      has_measurements: Boolean(customer.saved_measurements?.chest),
      saved_address: hasAddress
        ? {
            recipient_name: customer.full_name,
            city: customer.default_address?.city || '',
            address: customer.default_address?.text || '',
            postal_code: customer.default_address?.postal_code || '',
          }
        : undefined,
    };
  }

  async getCustomerByPhone(sellerId: string, phone: string): Promise<Customer | null> {
    const normalized = normalizePhone(phone);
    const sellerCustomers = this.customers[sellerId] || [];
    return sellerCustomers.find((c) => normalizePhone(c.phone) === normalized) || null;
  }

  async listCustomers(sellerId: string): Promise<Customer[]> {
    return this.customers[sellerId] || [];
  }

  async saveCustomer(sellerId: string, customer: Customer): Promise<Customer> {
    if (!this.customers[sellerId]) {
      this.customers[sellerId] = [];
    }
    const idx = this.customers[sellerId].findIndex((c) => c.customerId === customer.customerId);
    if (idx >= 0) {
      this.customers[sellerId][idx] = customer;
    } else {
      this.customers[sellerId].push(customer);
    }
    setStored(STORAGE_KEYS.CUSTOMERS, this.customers);
    return customer;
  }

  // --- Orders ---
  async createOrder(orderInput: Partial<Order>): Promise<{ order: Order; publicStatus: PublicStatus }> {
    const orderId = 'ord_' + generateRandomToken(18);
    const short_code = generateShortCode();
    const now = new Date().toISOString();

    const seller = this.sellers[orderInput.seller_id || ''];
    const sellerName = seller ? seller.shop_name : 'فروشگاه';

    const order: Order = {
      orderId,
      short_code,
      seller_id: orderInput.seller_id || '',
      customer_id: orderInput.customer_id || ('cust_' + generateRandomToken(10)),
      customer_name: orderInput.customer_name || 'مشتری',
      phone: normalizePhone(orderInput.phone || ''),
      instagram_id: orderInput.instagram_id || '',
      items: orderInput.items || [],
      subtotal: orderInput.subtotal || 0,
      shipping_cost: orderInput.shipping_cost || 0,
      discount: orderInput.discount || 0,
      total_amount: orderInput.total_amount || 0,
      deposit_required: orderInput.deposit_required || orderInput.total_amount || 0,
      deposit_paid_claimed: orderInput.deposit_paid_claimed || 0,
      paid_at_claimed: orderInput.paid_at_claimed,
      ship_to: orderInput.ship_to || {
        name: orderInput.customer_name || '',
        phone: orderInput.phone || '',
        city: '',
        address: '',
        is_gift: false,
      },
      delivery_due_date: orderInput.delivery_due_date,
      event_date: orderInput.event_date,
      flags: orderInput.flags || {},
      status: orderInput.status || 'submitted',
      status_history: [
        { status: orderInput.status || 'submitted', at: now, note: 'ثبت سفارش در سیستم' },
      ],
      created_at: now,
      files: orderInput.files || [],
    };

    // Update or create Customer record for the seller
    let customersBefore: string | null = null;
    if (order.seller_id && order.phone) {
      const existingCust = await this.getCustomerByPhone(order.seller_id, order.phone);
      customersBefore = JSON.stringify(this.customers[order.seller_id] || []);
      if (existingCust) {
        order.customer_id = existingCust.customerId;
        const typed = order.customer_name.trim();
        if (existingCust.full_name.startsWith(typed) && existingCust.full_name.length > typed.length) {
          order.customer_name = existingCust.full_name;
        }
        // If order used saved address placeholder, inject actual address string
        if (
          (!order.ship_to.address || order.ship_to.address === 'آدرس ذخیره‌شده مشتری') &&
          existingCust.default_address?.text
        ) {
          order.ship_to.address = existingCust.default_address.text;
          if (!order.ship_to.city) order.ship_to.city = existingCust.default_address.city || '';
          if (!order.ship_to.postal_code) order.ship_to.postal_code = existingCust.default_address.postal_code || '';
          if (!order.ship_to.name) order.ship_to.name = existingCust.full_name || '';
        }

        existingCust.orders_count += 1;
        existingCust.last_order_at = now;
        if (order.items[0]?.title) {
          existingCust.last_product_title = order.items[0].title;
        }
        // If not gift, update default address with new address if valid
        if (!order.ship_to.is_gift && order.ship_to.address && order.ship_to.address !== 'آدرس ذخیره‌شده مشتری') {
          existingCust.default_address = {
            city: order.ship_to.city,
            text: order.ship_to.address,
            postal_code: order.ship_to.postal_code,
          };
        }
        await this.saveCustomer(order.seller_id, existingCust);
      } else {
        const newCust: Customer = {
          customerId: order.customer_id,
          phone: order.phone,
          full_name: order.customer_name,
          instagram_id: order.instagram_id,
          orders_count: 1,
          last_order_at: now,
          last_product_title: order.items[0]?.title || '',
          default_address: order.ship_to.is_gift
            ? undefined
            : {
                city: order.ship_to.city,
                text: order.ship_to.address,
                postal_code: order.ship_to.postal_code,
              },
        };
        await this.saveCustomer(order.seller_id, newCust);
      }
    }

    const publicStatus: PublicStatus = {
      order_id: orderId,
      seller_id: order.seller_id,
      shop_name: sellerName,
      short_code: order.short_code,
      status: order.status,
      items_summary: order.items.map((i) => `${i.qty} × ${itemLabel(i)}`).join('، '),
      eta_text: order.delivery_due_date ? formatToJalaliText(order.delivery_due_date) : undefined,
      total_amount: order.total_amount,
      deposit_required: order.deposit_required,
      deposit_paid_claimed: order.deposit_paid_claimed,
      updated_at: now,
      card_number: seller?.card_number,
      card_holder_name: seller?.card_holder_name,
    };

    this.orders.unshift(order);
    this.publicStatuses[orderId] = publicStatus;
    const saved = setStored(STORAGE_KEYS.ORDERS, this.orders) && setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
    if (!saved) {
      this.orders = this.orders.filter((o) => o.orderId !== orderId);
      delete this.publicStatuses[orderId];
      if (customersBefore !== null) {
        this.customers[order.seller_id] = JSON.parse(customersBefore);
        setStored(STORAGE_KEYS.CUSTOMERS, this.customers);
      }
      setStored(STORAGE_KEYS.ORDERS, this.orders);
      throw new Error('حافظهٔ این دستگاه پر است و سفارش ذخیره نشد. عکس فیش کوچک‌تری بگذارید یا سفارش‌های قدیمی را خروجی بگیرید و پاک کنید.');
    }

    // Deterministic telemetry event
    await this.logEvent(order.seller_id, 'order_submitted', {
      orderId,
      short_code,
      total_amount: order.total_amount,
      status: order.status,
    });

    return { order, publicStatus };
  }

  async getPublicStatus(orderIdOrShortCode: string): Promise<PublicStatus | null> {
    const clean = orderIdOrShortCode.trim();
    // Match by orderId
    if (this.publicStatuses[clean]) {
      return this.publicStatuses[clean];
    }
    // Match by short_code (case-insensitive)
    const byShortCode = Object.values(this.publicStatuses).find(
      (s) => s.short_code.toUpperCase() === clean.toUpperCase()
    );
    return byShortCode || null;
  }

  async listOrders(sellerId: string): Promise<Order[]> {
    return this.orders.filter((o) => o.seller_id === sellerId);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.find((o) => o.orderId === orderId) || null;
  }

  /**
   * Strict State Machine Transitions (PRD Section 10)
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    trackingCode?: string,
    carrier?: CarrierType
  ): Promise<Order> {
    const order = this.orders.find((o) => o.orderId === orderId);
    if (!order) throw new Error('سفارش یافت نشد');

    const currentStatus = order.status;

    // Allowed transition validation
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      submitted: ['confirmed', 'needs_info', 'cancelled'],
      needs_info: ['submitted', 'cancelled'],
      confirmed: ['in_production', 'cancelled'],
      in_production: ['packed', 'cancelled'],
      packed: ['shipped', 'cancelled'],
      shipped: [], // Final
      awaiting_quote: ['quote_sent', 'cancelled'],
      quote_sent: ['submitted', 'cancelled'],
      cancelled: [], // Final
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`انتقال وضعیت از «${currentStatus}» به «${newStatus}» غیرمجاز است.`);
    }

    const now = new Date().toISOString();
    order.status = newStatus;
    order.status_history.push({ status: newStatus, at: now, note });

    if (carrier) order.carrier = carrier;
    if (trackingCode) order.tracking_code = trackingCode;
    if (note) order.seller_note = note;

    // Sync Public Status
    const pub = this.publicStatuses[orderId];
    if (pub) {
      pub.status = newStatus;
      pub.updated_at = now;
      if (carrier) pub.carrier = carrier;
      if (trackingCode) {
        pub.tracking_code = trackingCode;
        if (carrier === 'post') {
          pub.tracking_url = `https://tracking.post.ir/?id=${trackingCode}`;
        }
      }
      if (note && newStatus === 'needs_info') {
        pub.needs_info_reason = note;
      }
      this.publicStatuses[orderId] = pub;
      setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
    }

    setStored(STORAGE_KEYS.ORDERS, this.orders);

    await this.logEvent(order.seller_id, 'status_changed', {
      orderId,
      oldStatus: currentStatus,
      newStatus,
    });

    return order;
  }

  // Quote Flow
  async setOrderQuote(orderId: string, quoteAmount: number, note?: string): Promise<Order> {
    const order = this.orders.find((o) => o.orderId === orderId);
    if (!order) throw new Error('سفارش یافت نشد');

    const seller = this.sellers[order.seller_id];
    const depositPercent = seller?.deposit_percent_default || 50;
    const depositRequired = Math.round((quoteAmount * depositPercent) / 100);

    const now = new Date().toISOString();
    order.status = 'quote_sent';
    order.quote_amount = quoteAmount;
    order.total_amount = quoteAmount;
    order.subtotal = quoteAmount;
    order.deposit_required = depositRequired;
    order.quote_note = note;
    order.status_history.push({
      status: 'quote_sent',
      at: now,
      note: `اعلام قیمت: ${quoteAmount} تومان (بیعانه: ${depositRequired})`,
    });

    const pub = this.publicStatuses[orderId];
    if (pub) {
      pub.status = 'quote_sent';
      pub.quote_amount = quoteAmount;
      pub.total_amount = quoteAmount;
      pub.deposit_required = depositRequired;
      pub.updated_at = now;
      this.publicStatuses[orderId] = pub;
      setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
    }

    setStored(STORAGE_KEYS.ORDERS, this.orders);
    return order;
  }

  // Customer fulfills quote payment with slip
  async submitQuotePayment(orderId: string, depositPaid: number, receiptFile: OrderFile): Promise<Order> {
    const order = this.orders.find((o) => o.orderId === orderId);
    if (!order) throw new Error('سفارش یافت نشد');

    const now = new Date().toISOString();
    order.status = 'submitted';
    order.deposit_paid_claimed = depositPaid;
    order.paid_at_claimed = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    if (!order.files) order.files = [];
    order.files.push(receiptFile);
    order.status_history.push({
      status: 'submitted',
      at: now,
      note: `واریز بیعانه به مبلغ ${depositPaid} تومان و آپلود فیش`,
    });

    const pub = this.publicStatuses[orderId];
    if (pub) {
      pub.status = 'submitted';
      pub.deposit_paid_claimed = depositPaid;
      pub.updated_at = now;
      this.publicStatuses[orderId] = pub;
      setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
    }

    setStored(STORAGE_KEYS.ORDERS, this.orders);
    return order;
  }

  // --- Events Telemetry ---
  async logEvent(sellerId: string, type: EventType, meta?: Record<string, any>): Promise<void> {
    const event: AppEvent = {
      id: 'evt_' + generateRandomToken(12),
      seller_id: sellerId,
      type,
      at: new Date().toISOString(),
      meta,
    };
    this.events.push(event);
    setStored(STORAGE_KEYS.EVENTS, this.events);
  }

  async listEvents(sellerId: string): Promise<AppEvent[]> {
    return this.events.filter((e) => e.seller_id === sellerId);
  }

  // --- Materials & Recipes (P2) ---
  async listMaterials(sellerId: string): Promise<Material[]> {
    return this.materials[sellerId] || [];
  }

  async saveMaterial(sellerId: string, material: Material): Promise<Material> {
    if (!this.materials[sellerId]) {
      this.materials[sellerId] = [];
    }
    const idx = this.materials[sellerId].findIndex((m) => m.id === material.id);
    if (idx >= 0) {
      this.materials[sellerId][idx] = material;
    } else {
      this.materials[sellerId].push(material);
    }
    setStored(STORAGE_KEYS.MATERIALS, this.materials);
    return material;
  }

  async deleteMaterial(sellerId: string, materialId: string): Promise<void> {
    if (this.materials[sellerId]) {
      this.materials[sellerId] = this.materials[sellerId].filter((m) => m.id !== materialId);
      setStored(STORAGE_KEYS.MATERIALS, this.materials);
    }
  }

  // --- Production Data Management & CSV/Backup ---

  getAllSellers(): Seller[] {
    return Object.values(this.sellers);
  }

  isDemoSeller(sellerId: string): boolean {
    return sellerId === 'seller_nora' || sellerId === 'seller_sepideh';
  }

  // Clear orders for a seller (to start fresh in production or wipe test orders)
  async clearSellerOrders(sellerId: string): Promise<void> {
    const orderIdsToRemove = this.orders.filter((o) => o.seller_id === sellerId).map((o) => o.orderId);
    this.orders = this.orders.filter((o) => o.seller_id !== sellerId);
    for (const oid of orderIdsToRemove) {
      delete this.publicStatuses[oid];
    }
    setStored(STORAGE_KEYS.ORDERS, this.orders);
    setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);
  }

  // Delete a specific seller completely
  async deleteSeller(sellerId: string): Promise<void> {
    delete this.sellers[sellerId];
    delete this.products[sellerId];
    delete this.customers[sellerId];
    delete this.materials[sellerId];
    this.orders = this.orders.filter((o) => o.seller_id !== sellerId);
    if (this.currentSellerId === sellerId) {
      const custom = this.getCustomSellers();
      this.currentSellerId = custom.length > 0 ? custom[0].sellerId : '';
    }
    this.persistAll();
  }

  // Wipe all demo stores (Nora Candle and Sepideh Maison) completely
  async clearAllDemoData(): Promise<void> {
    delete this.sellers['seller_nora'];
    delete this.sellers['seller_sepideh'];
    delete this.products['seller_nora'];
    delete this.products['seller_sepideh'];
    delete this.customers['seller_nora'];
    delete this.customers['seller_sepideh'];
    delete this.materials['seller_nora'];
    delete this.materials['seller_sepideh'];
    this.orders = this.orders.filter(
      (o) => o.seller_id !== 'seller_nora' && o.seller_id !== 'seller_sepideh'
    );
    const custom = this.getCustomSellers();
    this.currentSellerId = custom.length > 0 ? custom[0].sellerId : '';
    this.persistAll();
  }

  // Export orders to Excel-compatible CSV with UTF-8 BOM (\uFEFF)
  exportOrdersCSV(sellerId: string): string {
    const sellerOrders = this.orders.filter((o) => o.seller_id === sellerId);
    const headers = [
      'کد سفارش',
      'نام خریدار',
      'شماره تماس',
      'استان و شهر',
      'آدرس پستی',
      'کد پستی',
      'هدیه',
      'تعداد اقلام',
      'شرح اقلام',
      'مبلغ کل (تومان)',
      'بیعانه پرداختی (تومان)',
      'وضعیت سفارش',
      'روش ارسال',
      'کد رهگیری پستی',
      'تاریخ ثبت',
    ];

    const statusLabels: Record<string, string> = {
      submitted: 'در انتظار تأیید فیش',
      confirmed: 'تأیید شده / آماده ساخت',
      in_production: 'در حال ساخت در کارگاه',
      packed: 'بسته‌بندی شده',
      shipped: 'ارسال شده',
      needs_info: 'نیازمند اطلاعات',
      awaiting_quote: 'استعلام قیمت',
      quote_sent: 'قیمت اعلام شد',
      cancelled: 'لغو شده',
    };

    const carrierLabels: Record<string, string> = {
      post: 'پست پیشتاز',
      tipax: 'تیپاکس',
      courier: 'پیک موتوری',
      other: 'سایر',
    };

    const rows = sellerOrders.map((o) => {
      const itemsSummary = o.items.map((it) => `${it.qty}x ${it.title}`).join(' | ');
      return [
        `"${o.short_code}"`,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${o.phone || ''}"`,
        `"${(o.ship_to.city || '').replace(/"/g, '""')}"`,
        `"${(o.ship_to.address || '').replace(/"/g, '""')}"`,
        `"${o.ship_to.postal_code || ''}"`,
        o.ship_to.is_gift ? '"بله"' : '"خیر"',
        o.items.reduce((sum, it) => sum + it.qty, 0),
        `"${itemsSummary.replace(/"/g, '""')}"`,
        o.total_amount || 0,
        o.deposit_paid_claimed || 0,
        `"${statusLabels[o.status] || o.status}"`,
        `"${carrierLabels[o.carrier || ''] || o.carrier || ''}"`,
        `"${o.tracking_code || ''}"`,
        `"${new Date(o.created_at).toLocaleDateString('fa-IR')}"`,
      ].join(',');
    });

    // Prepend UTF-8 BOM for Microsoft Excel Persian compatibility
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  }

  // Trigger direct browser CSV file download
  downloadOrdersCSV(sellerId: string): void {
    const csvContent = this.exportOrdersCSV(sellerId);
    const seller = this.sellers[sellerId];
    const filename = `orders_${seller?.handle || sellerId}_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export full JSON backup
  exportFullBackupJSON(): string {
    const backup = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      sellers: this.sellers,
      products: this.products,
      customers: this.customers,
      orders: this.orders,
      publicStatuses: this.publicStatuses,
      materials: this.materials,
      events: this.events,
    };
    return JSON.stringify(backup, null, 2);
  }

  // Import full JSON backup
  async importFullBackupJSON(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.sellers || !data.products) {
        throw new Error('فرمت فایل پشتیبان نامعتبر است');
      }
      this.sellers = data.sellers;
      this.products = data.products;
      this.customers = data.customers || {};
      this.orders = data.orders || [];
      this.publicStatuses = data.publicStatuses || {};
      this.materials = data.materials || {};
      this.events = data.events || [];
      this.persistAll();
      return true;
    } catch (err) {
      console.error('Import failed', err);
      return false;
    }
  }

  // --- Reset to Demo Data ---
  async resetToDemoData(): Promise<void> {
    const seed = getInitialSeedData();
    this.sellers = seed.sellers;
    this.products = seed.products;
    this.customers = seed.customers;
    this.orders = seed.orders;
    this.publicStatuses = seed.publicStatuses;
    this.events = [];
    this.currentSellerId = 'seller_nora';
    this.persistAll();
  }
}

export const dataService = new DataService();
