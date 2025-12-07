/**
 * Shared TypeScript Types for Admin Dashboard
 *
 * These types define the exact structure of data returned by the admin API.
 * Import these in both frontend and backend for type safety.
 *
 * Backend: import from './shared-types/AdminOrderTypes'
 * Frontend: Copy to src/types/AdminOrderTypes.ts
 */

export interface AdminOrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  product_slug: string;
  variant_details: {
    color: string;
    size: string;
    sku: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  custom_design: {
    design_data?: any; // Canvas positions, rotations, etc.
    design_images?: DesignImage[];
    custom_spec: CustomizationSpec;
  };
  production_status: string;
  mockup_url?: string;
  production_pack_url?: string;
}

export interface DesignImage {
  asset_id: string;
  file_url: string;
  kind: 'upload' | 'white_bg' | 'transparent'; // Use 'transparent' for production
  width?: number;
  height?: number;
  dpi?: number;
  original_name?: string;
}

export interface CustomizationSpec {
  method?: string; // decoration_method name
  placements?: Placement[];
  text_elements?: TextElement[];
  artwork_assets?: string[]; // asset IDs
  design_data?: any; // Canvas state
  notes?: string;
}

export interface Placement {
  location: string;
  x: number;
  y: number;
  width: number;
  height: number;
  artwork_id?: string;
  text_element_id?: string;
  colors?: string[];
  rotation?: number;
}

export interface TextElement {
  id: string;
  text: string;
  font_family: string;
  font_size: number;
  color: string;
  letter_spacing?: number;
  curved?: boolean;
  curve_radius?: number;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  shipping_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: AdminOrderItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  payment_intent_id?: string;
  production_status: 'pending' | 'in_production' | 'shipped' | 'cancelled';
  tracking_number?: string;
  carrier?: string;
  shipped_at?: Date | string;
  customer_notes?: string;
  internal_notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// API Request/Response Types

export interface GetAllOrdersFilters {
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  production_status?: 'pending' | 'in_production' | 'shipped' | 'cancelled';
}

export interface UpdateOrderStatusRequest {
  status: 'pending' | 'in_production' | 'shipped' | 'cancelled';
  tracking_number?: string;
  carrier?: string;
  internal_notes?: string;
}

export interface AdminAPIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Helper type guards for runtime type checking

export function isTransparentImage(image: DesignImage): boolean {
  return image.kind === 'transparent';
}

export function hasDesignImages(item: AdminOrderItem): boolean {
  return !!item.custom_design.design_images && item.custom_design.design_images.length > 0;
}

export function getTransparentImage(item: AdminOrderItem): DesignImage | undefined {
  return item.custom_design.design_images?.find(img => img.kind === 'transparent');
}

export function isPaid(order: AdminOrder): boolean {
  return order.payment_status === 'paid';
}

export function isShipped(order: AdminOrder): boolean {
  return order.production_status === 'shipped';
}

export function canShip(order: AdminOrder): boolean {
  return order.payment_status === 'paid' && order.production_status !== 'shipped';
}
