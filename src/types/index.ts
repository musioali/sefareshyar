/**
 * SefareshYar Type Definitions
 * Exact alignment with PRD Section 6 & 10
 */

export type BusinessType = 'fixed' | 'custom' | 'both';

export type PricingMode = 'fixed' | 'options' | 'quote';

export type ProductTemplate = 'dress' | 'painting' | 'cake' | 'name_necklace' | null;

export type OrderStatus =
  | 'submitted'
  | 'confirmed'
  | 'in_production'
  | 'packed'
  | 'shipped'
  | 'needs_info'
  | 'awaiting_quote'
  | 'quote_sent'
  | 'cancelled';

export type CarrierType = 'post' | 'tipax' | 'courier' | 'other';

export interface ProductFieldOption {
  label: string;
  price_delta: number;
}

export interface ProductField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'image' | 'spellcheck' | 'measurements';
  required: boolean;
  options?: ProductFieldOption[];
  placeholder?: string;
  helperText?: string;
}

export interface ProductRecipeItem {
  material_id: string;
  material_name?: string;
  qty: number;
  cost_per_unit?: number;
}

export interface Material {
  id: string;
  name: string;
  unit: 'g' | 'ml' | 'pcs';
  purchase_price: number;
  purchase_qty: number;
  cost_per_unit: number;
}

export interface Product {
  id: string;
  title: string;
  image_b64_small?: string;
  available: boolean;
  min_lead_days: number;
  pricing_mode: PricingMode;
  base_price: number;
  fields: ProductField[];
  template: ProductTemplate;
  reorder_cycle_days?: number;
  occasion_reminder?: boolean;
  recipe?: ProductRecipeItem[];
  packaging_cost?: number;
  labor_minutes?: number;
}

export interface Seller {
  sellerId: string;
  shop_name: string;
  handle: string;
  card_number: string;
  card_holder_name: string;
  business_type: BusinessType;
  shipping_default_cost: number;
  free_shipping_min_items: number;
  deposit_percent_default: number;
  is_accepting_orders: boolean;
  weekly_capacity?: number;
  created_at: string;
  products?: Product[];
}

export interface PublicShop {
  seller_id: string;
  shop_name: string;
  handle: string;
  business_type: BusinessType;
  card_number: string;
  card_holder_name: string;
  shipping_default_cost: number;
  free_shipping_min_items: number;
  deposit_percent_default: number;
  is_accepting_orders: boolean;
  products: Product[];
}

export interface CustomerSavedMeasurements {
  chest?: number;
  waist?: number;
  hip?: number;
  height?: number;
  custom_note?: string;
}

export interface CustomerAddress {
  city: string;
  text: string;
  postal_code?: string;
}

export interface Customer {
  customerId: string;
  phone: string;
  full_name: string;
  instagram_id?: string;
  default_address?: CustomerAddress;
  saved_measurements?: CustomerSavedMeasurements;
  orders_count: number;
  last_order_at: string;
  last_product_title: string;
}

export interface CustomerHint {
  first_name: string;
  city: string;
  last_product_title: string;
  has_address: boolean;
  has_measurements: boolean;
  saved_address?: {
    recipient_name?: string;
    city?: string;
    address?: string;
    postal_code?: string;
  };
}

export interface OrderItem {
  product_id: string;
  title: string;
  qty: number;
  unit_price: number; // snapshot
  options_selected?: Record<string, any>;
  fields_values?: Record<string, any>;
  photos?: string[];
}

export interface OrderShippingAddress {
  name: string;
  phone: string;
  city: string;
  address: string;
  postal_code?: string;
  is_gift: boolean;
}

export interface OrderFile {
  kind: 'receipt' | 'customer_photo';
  data_b64: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface OrderFlags {
  low_quality_photo?: boolean;
  needs_info?: boolean;
  price_mismatch?: boolean;
  info_request_reason?: string;
}

export interface Order {
  orderId: string;
  short_code: string;
  seller_id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  instagram_id?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total_amount: number;
  deposit_required: number;
  deposit_paid_claimed: number;
  paid_at_claimed?: string;
  ship_to: OrderShippingAddress;
  delivery_due_date?: string;
  event_date?: string;
  flags: OrderFlags;
  status: OrderStatus;
  status_history: OrderStatusEntry[];
  carrier?: CarrierType;
  tracking_code?: string;
  seller_note?: string;
  created_at: string;
  files?: OrderFile[];
  quote_amount?: number;
  quote_note?: string;
}

export interface PublicStatus {
  order_id: string;
  seller_id: string;
  shop_name: string;
  short_code: string;
  status: OrderStatus;
  items_summary: string;
  total_amount?: number;
  deposit_required?: number;
  deposit_paid_claimed?: number;
  eta_text?: string;
  carrier?: CarrierType;
  tracking_code?: string;
  tracking_url?: string;
  updated_at: string;
  card_number?: string;
  card_holder_name?: string;
  quote_amount?: number;
  needs_info_reason?: string;
}

export type EventType =
  | 'form_opened'
  | 'phone_entered'
  | 'step_completed'
  | 'order_submitted'
  | 'form_abandoned'
  | 'status_page_viewed'
  | 'status_changed'
  | 'reminder_copied';

export interface AppEvent {
  id: string;
  seller_id: string;
  type: EventType;
  at: string;
  meta?: Record<string, any>;
}
