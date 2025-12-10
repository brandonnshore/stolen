import { Request, Response, NextFunction } from 'express';
import { createOrder as createOrderService, getOrderById, getOrderByNumber, getOrderItems, updateOrderPaymentStatus } from '../services/orderService';
import { ApiError } from '../middleware/errorHandler';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any  // Latest API version for proper tax calculations
});

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderData = req.body;

    if (!orderData.customer || !orderData.items || !orderData.shipping_address) {
      throw new ApiError(400, 'customer, items, and shipping_address are required');
    }

    // Calculate tax using Stripe Tax
    const lineItems = orderData.items.map((item: any) => ({
      amount: Math.round(item.total_price * 100), // Convert to cents
      reference: item.variant_id || 'product',
      tax_code: 'txcd_20030000', // Apparel tax code
    }));

    // Add shipping as a line item for tax calculation
    if (orderData.shipping && orderData.shipping > 0) {
      lineItems.push({
        amount: Math.round(orderData.shipping * 100),
        reference: 'shipping',
        tax_code: 'txcd_92010001', // Shipping tax code
      });
    }

    // Create tax calculation
    const taxCalculation = await stripe.tax.calculations.create({
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

    const order = await createOrderService(orderData);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'usd',
      metadata: {
        order_id: order.id,
        order_number: order.order_number
      }
    });

    await updateOrderPaymentStatus(order.id, 'pending', paymentIntent.id);

    res.status(201).json({
      success: true,
      data: {
        order,
        client_secret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    next(error);
  }
};

export const capturePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      throw new ApiError(400, 'payment_intent_id is required');
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      const order = await updateOrderPaymentStatus(id, 'paid', payment_intent_id);

      res.status(200).json({
        success: true,
        data: { order }
      });
    } else {
      throw new ApiError(400, 'Payment not completed');
    }
  } catch (error) {
    next(error);
  }
};

export const calculateTax = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, shipping_address, shipping } = req.body;

    if (!items || !shipping_address) {
      throw new ApiError(400, 'items and shipping_address are required');
    }

    // Calculate tax using Stripe Tax
    const lineItems = items.map((item: any) => ({
      amount: Math.round(item.total_price * 100), // Convert to cents
      reference: item.variant_id || 'product',
      tax_code: 'txcd_20030000', // Apparel tax code
    }));

    // Add shipping as a line item for tax calculation
    if (shipping && shipping > 0) {
      lineItems.push({
        amount: Math.round(shipping * 100),
        reference: 'shipping',
        tax_code: 'txcd_92010001', // Shipping tax code
      });
    }

    // Create tax calculation
    const taxCalculation = await stripe.tax.calculations.create({
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

    res.status(200).json({
      success: true,
      data: {
        tax: taxCalculation.tax_amount_exclusive / 100, // Convert from cents to dollars
        tax_breakdown: taxCalculation.tax_breakdown,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(id);

    let order;
    if (isUuid) {
      // Try to get by UUID first
      order = await getOrderById(id);
    } else {
      // Try to get by order number
      order = await getOrderByNumber(id);
    }

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const items = await getOrderItems(order.id);

    res.status(200).json({
      success: true,
      data: {
        order,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};
