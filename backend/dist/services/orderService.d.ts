import { Order, OrderItem } from '../models/types';
/**
 * Create a new order with transaction support
 * Creates or retrieves customer, generates order number, creates order items, and logs status history
 * @param orderData - Order data including customer info, items, and shipping details
 * @returns Newly created order object
 * @throws {Error} If transaction fails, all changes are rolled back
 */
export declare const createOrder: (orderData: any) => Promise<Order>;
/**
 * Get order by ID
 * @param orderId - Order UUID
 * @returns Order object or null if not found
 */
export declare const getOrderById: (orderId: string) => Promise<Order | null>;
/**
 * Get order by order number
 * @param orderNumber - Order number (e.g., "RB-1732635600000-ABC12")
 * @returns Order object or null if not found
 */
export declare const getOrderByNumber: (orderNumber: string) => Promise<Order | null>;
/**
 * Get all items for an order
 * @param orderId - Order UUID
 * @returns Array of order items with customization details
 */
export declare const getOrderItems: (orderId: string) => Promise<OrderItem[]>;
/**
 * Update order payment status
 * @param orderId - Order UUID
 * @param status - Payment status (e.g., 'succeeded', 'failed', 'pending')
 * @param paymentIntentId - Optional Stripe payment intent ID
 * @returns Updated order object
 * @throws {ApiError} 404 if order not found
 */
export declare const updateOrderPaymentStatus: (orderId: string, status: string, paymentIntentId?: string) => Promise<Order>;
/**
 * Update order production status
 * @param orderId - Order UUID
 * @param status - Production status (e.g., 'processing', 'shipped', 'delivered')
 * @param trackingNumber - Optional shipping tracking number
 * @returns Updated order object
 * @throws {ApiError} 404 if order not found
 */
export declare const updateOrderProductionStatus: (orderId: string, status: string, trackingNumber?: string) => Promise<Order>;
/**
 * Get all orders with optional filters
 * @param filters - Optional filters object (payment_status, production_status)
 * @returns Array of orders sorted by creation date (newest first)
 */
export declare const getAllOrders: (filters?: any) => Promise<Order[]>;
//# sourceMappingURL=orderService.d.ts.map