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
import {
  hashCustomerIdentifier,
  generateShortCode,
  generateRandomToken,
  normalizePhone,
} from '../utils/persianUtils';

const STORAGE_KEYS = {
  SELLERS: 'sefareshyar_sellers_v2',
  PRODUCTS: 'sefareshyar_products_v2',
  CUSTOMERS: 'sefareshyar_customers_v2',
  ORDERS: 'sefareshyar_orders_v2',
  PUBLIC_STATUS: 'sefareshyar_public_status_v2',
  EVENTS: 'sefareshyar_events_v2',
  MATERIALS: 'sefareshyar_materials_v2',
  CURRENT_SELLER_ID: 'sefareshyar_current_seller_id_v2',
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

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`LocalStorage quota exceeded or unavailable for key: ${key}`, err);
  }
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
      shipping_default_cost: 45000,
      free_shipping_min_items: 3,
      deposit_percent_default: 100,
      is_accepting_orders: true,
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
    seller_sepideh: {
      sellerId: 'seller_sepideh',
      shop_name: 'مزون سپیده و گالری هنری',
      handle: 'sepideh_art',
      card_number: '5892101234567890',
      card_holder_name: 'سپیده تهرانی',
      business_type: 'both',
      shipping_default_cost: 65000,
      free_shipping_min_items: 2,
      deposit_percent_default: 50,
      is_accepting_orders: true,
      created_at: new Date('2026-09-10T10:00:00Z').toISOString(),
    },
  };

  const products: Record<string, Product[]> = {
    seller_nora: [
      {
        id: 'prod_candle_small',
        title: 'شمع معطر شیشه‌ای کوچک (۲۰۰ گرمی موم سویا)',
        image_b64_small: '',
        available: true,
        min_lead_days: 2,
        pricing_mode: 'fixed',
        base_price: 260000,
        fields: [],
        template: null,
        recipe: [
          { material_id: 'mat_soy_wax', qty: 200 },
          { material_id: 'mat_jar_small', qty: 1 },
          { material_id: 'mat_wick', qty: 1 },
          { material_id: 'mat_fragrance', qty: 15 },
        ],
        packaging_cost: 43000,
      },
      {
        id: 'prod_candle_large',
        title: 'شمع معطر دست‌ساز بزرگ (۴۰۰ گرمی دو فتیله)',
        image_b64_small: '',
        available: true,
        min_lead_days: 3,
        pricing_mode: 'fixed',
        base_price: 420000,
        fields: [],
        template: null,
        recipe: [
          { material_id: 'mat_soy_wax', qty: 400 },
          { material_id: 'mat_jar_large', qty: 1 },
          { material_id: 'mat_wick', qty: 2 },
          { material_id: 'mat_fragrance', qty: 30 },
        ],
        packaging_cost: 48000,
      },
      {
        id: 'prod_gift_set',
        title: 'ست هدیه شمع و جا شمعی بتنی مینیمال',
        image_b64_small: '',
        available: true,
        min_lead_days: 3,
        pricing_mode: 'fixed',
        base_price: 580000,
        fields: [],
        template: null,
      },
      {
        id: 'prod_scented_tablet',
        title: 'قرص مومی معطر کمد لباس (۳ عددی)',
        image_b64_small: '',
        available: false, // out of stock test
        min_lead_days: 1,
        pricing_mode: 'fixed',
        base_price: 180000,
        fields: [],
        template: null,
      },
    ],
    seller_sepideh: [
      {
        id: 'prod_dress_linen',
        title: 'پیراهن لینن نچرال دست‌دوز بهاره',
        image_b64_small: '',
        available: true,
        min_lead_days: 7,
        pricing_mode: 'options',
        base_price: 890000,
        template: 'dress',
        fields: [
          {
            key: 'measurements',
            label: 'اندازه‌های شخصی (سانتی‌متر)',
            type: 'measurements',
            required: true,
          },
          {
            key: 'fabric_color',
            label: 'رنگ پارچه لینن',
            type: 'radio',
            required: true,
            options: [
              { label: 'کرم نچرال', price_delta: 0 },
              { label: 'سبز سدری', price_delta: 30000 },
              { label: 'آبی آسمانی', price_delta: 30000 },
            ],
          },
        ],
      },
      {
        id: 'prod_painting_custom',
        title: 'تابلو نقاشی آبرنگ اختصاصی از عکس',
        image_b64_small: '',
        available: true,
        min_lead_days: 10,
        pricing_mode: 'options',
        base_price: 750000,
        template: 'painting',
        fields: [
          {
            key: 'size',
            label: 'ابعاد تابلو',
            type: 'select',
            required: true,
            options: [
              { label: 'سایز A4 (۲۱×۳۰ سانتی‌متر)', price_delta: 0 },
              { label: 'سایز A3 (۳۰×۴۲ سانتی‌متر)', price_delta: 250000 },
            ],
          },
          {
            key: 'frame',
            label: 'قاب چوبی محافظ شیشه‌دار',
            type: 'radio',
            required: true,
            options: [
              { label: 'بدون قاب (ارسال روی مقوای مخصوص)', price_delta: 0 },
              { label: 'با قاب چوب روسی و پاسپارتو', price_delta: 160000 },
            ],
          },
          {
            key: 'reference_photos',
            label: 'عکس‌های مرجع باکیفیت',
            type: 'image',
            required: true,
          },
        ],
      },
      {
        id: 'prod_custom_cake',
        title: 'کیک خانگی خامه و شکلات بلژیکی',
        image_b64_small: '',
        available: true,
        min_lead_days: 4,
        pricing_mode: 'quote', // Quote test scenario
        base_price: 0,
        template: 'cake',
        fields: [
          {
            key: 'cake_flavor',
            label: 'طعم پایه و فیلینگ',
            type: 'select',
            required: true,
            options: [
              { label: 'وانیل با فیلینگ موز، گردو و کارامل', price_delta: 0 },
              { label: 'شکلات تلخ ۷۰٪ بلژیکی با پسته', price_delta: 80000 },
            ],
          },
          {
            key: 'cake_text',
            label: 'متن دقیق روی کیک',
            type: 'spellcheck',
            required: true,
          },
          {
            key: 'event_date',
            label: 'تاریخ دقیق مراسم',
            type: 'date',
            required: true,
          },
        ],
      },
    ],
  };

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
        orders_count: 2,
        last_order_at: new Date('2026-10-01T14:30:00Z').toISOString(),
        last_product_title: 'شمع معطر شیشه‌ای کوچک (۲۰۰ گرمی موم سویا)',
      },
    ],
    seller_sepideh: [
      {
        customerId: 'cust_sara',
        phone: '09351234567',
        full_name: 'سارا مرادی',
        instagram_id: 'sara_moradi',
        default_address: {
          city: 'شیراز',
          text: 'قصرالدشت، کوچه ۱۵، پلاک ۸',
          postal_code: '7193612345',
        },
        saved_measurements: {
          chest: 92,
          waist: 74,
          hip: 98,
          height: 168,
        },
        orders_count: 3,
        last_order_at: new Date('2026-09-25T11:00:00Z').toISOString(),
        last_product_title: 'پیراهن لینن نچرال دست‌دوز بهاره',
      },
    ],
  };

  // Seed sample orders for tests
  const now = new Date();
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const orders: Order[] = [
    {
      orderId: 'ord_sample_submitted',
      short_code: 'N4K7P',
      seller_id: 'seller_nora',
      customer_id: 'cust_maryam',
      customer_name: 'مریم احمدی',
      phone: '09123456789',
      instagram_id: 'maryam_ahmadii',
      items: [
        {
          product_id: 'prod_candle_small',
          title: 'شمع معطر شیشه‌ای کوچک (۲۰۰ گرمی موم سویا)',
          qty: 2,
          unit_price: 260000,
        },
      ],
      subtotal: 520000,
      shipping_cost: 45000,
      discount: 0,
      total_amount: 565000,
      deposit_required: 565000,
      deposit_paid_claimed: 565000,
      paid_at_claimed: '۱۴:۳۲',
      ship_to: {
        name: 'مریم احمدی',
        phone: '09123456789',
        city: 'تهران',
        address: 'سعادت‌آباد، خیابان صرافها، کوچه ۳۵، پلاک ۱۲، واحد ۴',
        postal_code: '1998877665',
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
      created_at: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
      files: [
        {
          kind: 'receipt',
          data_b64: '',
          width: 800,
          height: 1200,
          bytes: 145000,
        },
      ],
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
          title: 'شمع معطر دست‌ساز بزرگ (۴۰۰ گرمی دو فتیله)',
          qty: 1,
          unit_price: 420000,
        },
        {
          product_id: 'prod_gift_set',
          title: 'ست هدیه شمع و جا شمعی بتنی مینیمال',
          qty: 2,
          unit_price: 580000,
        },
      ],
      subtotal: 1580000,
      shipping_cost: 0, // Free shipping triggered (qty = 3 >= free_shipping_min_items)
      discount: 0,
      total_amount: 1580000,
      deposit_required: 1580000,
      deposit_paid_claimed: 1580000,
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
          title: 'شمع معطر شیشه‌ای کوچک (۲۰۰ گرمی موم سویا)',
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
          title: 'ست هدیه شمع و جا شمعی بتنی مینیمال',
          qty: 1,
          unit_price: 580000,
        },
      ],
      subtotal: 580000,
      shipping_cost: 45000,
      discount: 0,
      total_amount: 625000,
      deposit_required: 625000,
      deposit_paid_claimed: 625000,
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
      created_at: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
    },
    // Quote order for Sepideh
    {
      orderId: 'ord_sample_quote',
      short_code: 'Q2W7E',
      seller_id: 'seller_sepideh',
      customer_id: 'cust_sara',
      customer_name: 'سارا مرادی',
      phone: '09351234567',
      items: [
        {
          product_id: 'prod_custom_cake',
          title: 'کیک خانگی خامه و شکلات بلژیکی',
          qty: 1,
          unit_price: 0,
          fields_values: {
            cake_flavor: 'شکلات تلخ ۷۰٪ بلژیکی با پسته',
            cake_text: 'تولدت مبارک کیان مهربون ❤️',
            event_date: fiveDaysLater.split('T')[0],
          },
        },
      ],
      subtotal: 0,
      shipping_cost: 0,
      discount: 0,
      total_amount: 0,
      deposit_required: 0,
      deposit_paid_claimed: 0,
      ship_to: {
        name: 'سارا مرادی',
        phone: '09351234567',
        city: 'شیراز',
        address: 'قصرالدشت، کوچه ۱۵، پلاک ۸',
        postal_code: '7193612345',
        is_gift: false,
      },
      flags: {
        needs_info: false,
      },
      status: 'awaiting_quote',
      status_history: [
        { status: 'awaiting_quote', at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString() },
      ],
      created_at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
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
    seller_sepideh: [
      { id: 'mat_linen', name: 'پارچه لینن ترک درجه یک', unit: 'g', purchase_price: 450000, purchase_qty: 1, cost_per_unit: 450000 },
      { id: 'mat_thread', name: 'نخ ابریشم و دکمه صدف', unit: 'pcs', purchase_price: 60000, purchase_qty: 1, cost_per_unit: 60000 },
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
      this.currentSellerId = getStored(STORAGE_KEYS.CURRENT_SELLER_ID, 'seller_nora');
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
  getCurrentSellerId(): string {
    return this.currentSellerId;
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
    setStored(STORAGE_KEYS.SELLERS, this.sellers);
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
    return {
      first_name: firstName,
      city: customer.default_address?.city || '',
      last_product_title: customer.last_product_title || '',
      has_address: Boolean(customer.default_address?.text),
      has_measurements: Boolean(customer.saved_measurements?.chest),
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
    if (order.seller_id && order.phone) {
      const existingCust = await this.getCustomerByPhone(order.seller_id, order.phone);
      if (existingCust) {
        existingCust.orders_count += 1;
        existingCust.last_order_at = now;
        if (order.items[0]?.title) {
          existingCust.last_product_title = order.items[0].title;
        }
        // If not gift, update default address
        if (!order.ship_to.is_gift && order.ship_to.address) {
          existingCust.default_address = {
            city: order.ship_to.city,
            text: order.ship_to.address,
            postal_code: order.ship_to.postal_code,
          };
        }
        await this.saveCustomer(order.seller_id, existingCust);
      } else {
        const newCust: Customer = {
          customerId: 'cust_' + generateRandomToken(12),
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
      items_summary: order.items.map((i) => `${i.qty} × ${i.title}`).join('، '),
      total_amount: order.total_amount,
      deposit_required: order.deposit_required,
      deposit_paid_claimed: order.deposit_paid_claimed,
      updated_at: now,
      card_number: seller?.card_number,
      card_holder_name: seller?.card_holder_name,
    };

    this.orders.unshift(order);
    this.publicStatuses[orderId] = publicStatus;
    setStored(STORAGE_KEYS.ORDERS, this.orders);
    setStored(STORAGE_KEYS.PUBLIC_STATUS, this.publicStatuses);

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
