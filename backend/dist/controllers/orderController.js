"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrder = exports.calculateTax = exports.capturePayment = exports.createOrder = void 0;
const orderService_1 = require("../services/orderService");
const errorHandler_1 = require("../middleware/errorHandler");
const env_1 = require("../config/env");
const stripe_1 = __importDefault(require("stripe"));
// Lazy initialization of Stripe to prevent module loading failures
let stripeClient = null;
function getStripe() {
    if (!stripeClient) {
        stripeClient = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-12-18.acacia' // Latest stable API version for proper tax calculations
        });
    }
    return stripeClient;
}
const createOrder = async (req, res, next) => {
    try {
        const orderData = req.body;
        if (!orderData.customer || !orderData.items || !orderData.shipping_address) {
            throw new errorHandler_1.ApiError(400, 'customer, items, and shipping_address are required');
        }
        // Calculate tax using Stripe Tax
        const lineItems = orderData.items.map((item) => ({
            amount: Math.round(item.total_price * 100), // Convert to cents
            reference: item.variant_id || 'product',
            tax_code: 'txcd_20030000', // Apparel tax code
        }));
        // Add shipping as a line item for tax calculation
        if (orderData.shipping && orderData.shipping > 0) {
            lineItems.push({
                amount: Math.round(orderData.shipping * 100),
                reference: 'shipping_fee',
                tax_code: 'txcd_92010001', // Shipping tax code
            });
        }
        // Create tax calculation
        const taxCalculation = await getStripe().tax.calculations.create({
            currency: 'usd',
            line_items: lineItems,
            customer_details: {
                address: {
                    line1: orderData.shipping_address.line1,
                    city: orderData.shipping_address.city,
                    state: orderData.shipping_address.state,
                    postal_code: orderData.shipping_address.postal_code,
                    country: orderData.shipping_address.country || 'US',
                },
                address_source: 'shipping',
            },
        });
        // Update orderData with calculated tax
        orderData.tax = taxCalculation.tax_amount_exclusive / 100; // Convert from cents to dollars
        orderData.total = orderData.subtotal + orderData.shipping + orderData.tax;
        const order = await (0, orderService_1.createOrder)(orderData);
        const paymentIntent = await getStripe().paymentIntents.create({
            amount: Math.round(order.total * 100),
            currency: 'usd',
            metadata: {
                order_id: order.id,
                order_number: order.order_number
            }
        });
        await (0, orderService_1.updateOrderPaymentStatus)(order.id, 'pending', paymentIntent.id);
        res.status(201).json({
            success: true,
            data: {
                order,
                client_secret: paymentIntent.client_secret
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createOrder = createOrder;
const capturePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { payment_intent_id } = req.body;
        if (!payment_intent_id) {
            throw new errorHandler_1.ApiError(400, 'payment_intent_id is required');
        }
        // Verify payment intent with Stripe
        const paymentIntent = await getStripe().paymentIntents.retrieve(payment_intent_id);
        if (paymentIntent.status === 'succeeded') {
            const order = await (0, orderService_1.updateOrderPaymentStatus)(id, 'paid', payment_intent_id);
            res.status(200).json({
                success: true,
                data: { order }
            });
        }
        else {
            throw new errorHandler_1.ApiError(400, 'Payment not completed');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.capturePayment = capturePayment;
const calculateTax = async (req, res, next) => {
    try {
        const { items, shipping_address, shipping } = req.body;
        if (!items || !shipping_address) {
            throw new errorHandler_1.ApiError(400, 'items and shipping_address are required');
        }
        // Calculate tax using Stripe Tax
        const lineItems = items.map((item) => ({
            amount: Math.round(item.total_price * 100), // Convert to cents
            reference: item.variant_id || 'product',
            tax_code: 'txcd_20030000', // Apparel tax code
        }));
        // Add shipping as a line item for tax calculation
        if (shipping && shipping > 0) {
            lineItems.push({
                amount: Math.round(shipping * 100),
                reference: 'shipping_fee',
                tax_code: 'txcd_92010001', // Shipping tax code
            });
        }
        // Create tax calculation
        console.log('[TAX] Calculating tax for address:', {
            city: shipping_address.city,
            state: shipping_address.state,
            postal_code: shipping_address.postal_code,
            country: shipping_address.country || 'US',
        });
        const taxCalculation = await getStripe().tax.calculations.create({
            currency: 'usd',
            line_items: lineItems,
            customer_details: {
                address: {
                    line1: shipping_address.line1,
                    city: shipping_address.city,
                    state: shipping_address.state,
                    postal_code: shipping_address.postal_code,
                    country: shipping_address.country || 'US',
                },
                address_source: 'shipping',
            },
        });
        console.log('[TAX] Tax calculation result:', {
            tax_amount: taxCalculation.tax_amount_exclusive / 100,
            currency: taxCalculation.currency,
            breakdown: taxCalculation.tax_breakdown,
        });
        res.status(200).json({
            success: true,
            data: {
                tax: taxCalculation.tax_amount_exclusive / 100, // Convert from cents to dollars
                tax_breakdown: taxCalculation.tax_breakdown,
            }
        });
    }
    catch (error) {
        console.error('[TAX] Error calculating tax:', {
            message: error.message,
            code: error.code,
            type: error.type,
            detail: error.raw?.message,
        });
        next(error);
    }
};
exports.calculateTax = calculateTax;
const getOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Check if ID is a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(id);
        let order;
        if (isUuid) {
            // Try to get by UUID first
            order = await (0, orderService_1.getOrderById)(id);
        }
        else {
            // Try to get by order number
            order = await (0, orderService_1.getOrderByNumber)(id);
        }
        if (!order) {
            throw new errorHandler_1.ApiError(404, 'Order not found');
        }
        const items = await (0, orderService_1.getOrderItems)(order.id);
        res.status(200).json({
            success: true,
            data: {
                order,
                items
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrder = getOrder;
//# sourceMappingURL=orderController.js.map