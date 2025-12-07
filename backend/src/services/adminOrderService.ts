import pool from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { sendOrderStatusUpdateEmail } from './emailService';
import { logger } from '../utils/logger';

/**
 * Enhanced Admin Order Service
 * Provides comprehensive order data for the admin dashboard with all necessary joins
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
    design_data?: any;
    design_images?: Array<{
      asset_id: string;
      file_url: string;
      kind: string;
      width?: number;
      height?: number;
      dpi?: number;
    }>;
    custom_spec: any;
  };
  production_status: string;
  mockup_url?: string;
  production_pack_url?: string;
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
  billing_address?: any;
  items: AdminOrderItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  payment_status: string;
  payment_method?: string;
  payment_intent_id?: string;
  production_status: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: Date;
  customer_notes?: string;
  internal_notes?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get all orders with complete data for admin dashboard
 * Includes customer info, order items, product details, and design images
 */
export const getAllOrdersForAdmin = async (filters?: any): Promise<AdminOrder[]> => {
  let query = `
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.subtotal,
      o.tax,
      o.shipping,
      o.discount,
      o.total,
      o.payment_status,
      o.payment_method,
      o.payment_intent_id,
      o.production_status,
      o.tracking_number,
      o.carrier,
      o.shipped_at,
      o.shipping_address,
      o.billing_address,
      o.customer_notes,
      o.internal_notes,
      o.created_at,
      o.updated_at,
      c.id as customer_id,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone
    FROM orders o
    INNER JOIN customers c ON o.customer_id = c.id
  `;

  const conditions = [];
  const values = [];
  let paramCount = 1;

  if (filters?.payment_status) {
    conditions.push(`o.payment_status = $${paramCount}`);
    values.push(filters.payment_status);
    paramCount++;
  }

  if (filters?.production_status) {
    conditions.push(`o.production_status = $${paramCount}`);
    values.push(filters.production_status);
    paramCount++;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY o.created_at DESC';

  const ordersResult = await pool.query(query, values);

  // Fetch order items with product and variant details for all orders
  const orders: AdminOrder[] = await Promise.all(
    ordersResult.rows.map(async (orderRow) => {
      const items = await getOrderItemsWithDetails(orderRow.id);

      return {
        id: orderRow.id,
        order_number: orderRow.order_number,
        customer: {
          id: orderRow.customer_id,
          name: orderRow.customer_name,
          email: orderRow.customer_email,
          phone: orderRow.customer_phone,
        },
        shipping_address: orderRow.shipping_address,
        billing_address: orderRow.billing_address,
        items,
        totals: {
          subtotal: parseFloat(orderRow.subtotal),
          tax: parseFloat(orderRow.tax),
          shipping: parseFloat(orderRow.shipping),
          discount: parseFloat(orderRow.discount),
          total: parseFloat(orderRow.total),
        },
        payment_status: orderRow.payment_status,
        payment_method: orderRow.payment_method,
        payment_intent_id: orderRow.payment_intent_id,
        production_status: orderRow.production_status,
        tracking_number: orderRow.tracking_number,
        carrier: orderRow.carrier,
        shipped_at: orderRow.shipped_at,
        customer_notes: orderRow.customer_notes,
        internal_notes: orderRow.internal_notes,
        created_at: orderRow.created_at,
        updated_at: orderRow.updated_at,
      };
    })
  );

  return orders;
};

/**
 * Get a single order by ID with complete details for admin dashboard
 */
export const getOrderByIdForAdmin = async (orderId: string): Promise<AdminOrder | null> => {
  const orderResult = await pool.query(
    `
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.subtotal,
      o.tax,
      o.shipping,
      o.discount,
      o.total,
      o.payment_status,
      o.payment_method,
      o.payment_intent_id,
      o.production_status,
      o.tracking_number,
      o.carrier,
      o.shipped_at,
      o.shipping_address,
      o.billing_address,
      o.customer_notes,
      o.internal_notes,
      o.created_at,
      o.updated_at,
      c.id as customer_id,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone
    FROM orders o
    INNER JOIN customers c ON o.customer_id = c.id
    WHERE o.id = $1
    `,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const orderRow = orderResult.rows[0];
  const items = await getOrderItemsWithDetails(orderRow.id);

  return {
    id: orderRow.id,
    order_number: orderRow.order_number,
    customer: {
      id: orderRow.customer_id,
      name: orderRow.customer_name,
      email: orderRow.customer_email,
      phone: orderRow.customer_phone,
    },
    shipping_address: orderRow.shipping_address,
    billing_address: orderRow.billing_address,
    items,
    totals: {
      subtotal: parseFloat(orderRow.subtotal),
      tax: parseFloat(orderRow.tax),
      shipping: parseFloat(orderRow.shipping),
      discount: parseFloat(orderRow.discount),
      total: parseFloat(orderRow.total),
    },
    payment_status: orderRow.payment_status,
    payment_method: orderRow.payment_method,
    payment_intent_id: orderRow.payment_intent_id,
    production_status: orderRow.production_status,
    tracking_number: orderRow.tracking_number,
    carrier: orderRow.carrier,
    shipped_at: orderRow.shipped_at,
    customer_notes: orderRow.customer_notes,
    internal_notes: orderRow.internal_notes,
    created_at: orderRow.created_at,
    updated_at: orderRow.updated_at,
  };
};

/**
 * Helper function to get order items with complete product, variant, and design details
 * Includes Gemini-generated design images from the assets table
 */
async function getOrderItemsWithDetails(orderId: string): Promise<AdminOrderItem[]> {
  const itemsResult = await pool.query(
    `
    SELECT
      oi.id,
      oi.order_id,
      oi.variant_id,
      oi.quantity,
      oi.unit_price,
      oi.total_price,
      oi.custom_spec,
      oi.production_status,
      oi.mockup_url,
      oi.production_pack_url,
      p.title as product_name,
      p.slug as product_slug,
      v.color,
      v.size,
      v.sku
    FROM order_items oi
    INNER JOIN variants v ON oi.variant_id = v.id
    INNER JOIN products p ON v.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY oi.created_at
    `,
    [orderId]
  );

  // For each order item, fetch associated design images from assets table
  const items: AdminOrderItem[] = await Promise.all(
    itemsResult.rows.map(async (item) => {
      // Get design images/assets linked to this order item
      // Look for assets with owner_type='order' and owner_id matching the order
      // OR look in the custom_spec for artwork_assets array
      const designImages = await getDesignImagesForOrderItem(item);

      return {
        id: item.id,
        order_id: item.order_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        product_slug: item.product_slug,
        variant_details: {
          color: item.color,
          size: item.size,
          sku: item.sku,
        },
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        custom_design: {
          design_data: item.custom_spec?.design_data,
          design_images: designImages,
          custom_spec: item.custom_spec,
        },
        production_status: item.production_status,
        mockup_url: item.mockup_url,
        production_pack_url: item.production_pack_url,
      };
    })
  );

  return items;
}

/**
 * Helper function to get design images for an order item
 * Fetches from assets table based on custom_spec artwork references
 */
async function getDesignImagesForOrderItem(orderItem: any): Promise<Array<{
  asset_id: string;
  file_url: string;
  kind: string;
  width?: number;
  height?: number;
  dpi?: number;
}>> {
  const designImages: Array<{
    asset_id: string;
    file_url: string;
    kind: string;
    width?: number;
    height?: number;
    dpi?: number;
  }> = [];

  // Check if custom_spec has artwork_assets array (asset IDs)
  if (orderItem.custom_spec?.artwork_assets && Array.isArray(orderItem.custom_spec.artwork_assets)) {
    const assetIds = orderItem.custom_spec.artwork_assets;

    if (assetIds.length > 0) {
      const assetsResult = await pool.query(
        `
        SELECT
          id as asset_id,
          file_url,
          kind,
          width,
          height,
          dpi,
          original_name
        FROM assets
        WHERE id = ANY($1::uuid[])
        ORDER BY created_at
        `,
        [assetIds]
      );

      designImages.push(...assetsResult.rows);
    }
  }

  // Also check for design_data with placements that reference artwork_id
  if (orderItem.custom_spec?.placements && Array.isArray(orderItem.custom_spec.placements)) {
    const artworkIds = orderItem.custom_spec.placements
      .filter((p: any) => p.artwork_id)
      .map((p: any) => p.artwork_id);

    if (artworkIds.length > 0) {
      const assetsResult = await pool.query(
        `
        SELECT
          id as asset_id,
          file_url,
          kind,
          width,
          height,
          dpi,
          original_name
        FROM assets
        WHERE id = ANY($1::uuid[])
        ORDER BY created_at
        `,
        [artworkIds]
      );

      // Merge without duplicates
      assetsResult.rows.forEach((asset) => {
        if (!designImages.find((img) => img.asset_id === asset.asset_id)) {
          designImages.push(asset);
        }
      });
    }
  }

  return designImages;
}

/**
 * Update order production status and tracking number
 */
export const updateOrderProductionStatusAdmin = async (
  orderId: string,
  status: string,
  trackingNumber?: string,
  carrier?: string,
  internalNotes?: string
): Promise<AdminOrder> => {
  // Get current order to track status change
  const currentOrderResult = await pool.query(
    'SELECT production_status FROM orders WHERE id = $1',
    [orderId]
  );
  const oldStatus = currentOrderResult.rows[0]?.production_status || '';

  const fields = ['production_status = $1'];
  const values: any[] = [status];
  let paramCount = 2;

  if (trackingNumber) {
    fields.push(`tracking_number = $${paramCount}`);
    values.push(trackingNumber);
    paramCount++;
  }

  if (carrier) {
    fields.push(`carrier = $${paramCount}`);
    values.push(carrier);
    paramCount++;
  }

  if (internalNotes) {
    fields.push(`internal_notes = $${paramCount}`);
    values.push(internalNotes);
    paramCount++;
  }

  if (status === 'shipped') {
    fields.push(`shipped_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;
  }

  values.push(orderId);

  const result = await pool.query(
    `UPDATE orders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Order not found');
  }

  // Add status history
  await pool.query(
    `INSERT INTO order_status_history (order_id, new_status, notes)
     VALUES ($1, $2, $3)`,
    [orderId, status, `Production status updated to ${status}${trackingNumber ? ` with tracking ${trackingNumber}` : ''}`]
  );

  // Return the full order details
  const updatedOrder = await getOrderByIdForAdmin(orderId);
  if (!updatedOrder) {
    throw new ApiError(404, 'Order not found after update');
  }

  // Send status update email (async, don't wait)
  if (oldStatus !== status) {
    sendOrderStatusUpdateEmail(updatedOrder, oldStatus).catch((error) => {
      logger.error('Failed to send status update email', {
        error,
        order_id: orderId,
        old_status: oldStatus,
        new_status: status
      });
    });
  }

  return updatedOrder;
};
