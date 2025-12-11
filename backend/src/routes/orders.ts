import { Router } from 'express';
import { createOrder, capturePayment, getOrder, calculateTax } from '../controllers/orderController';

const router = Router();

// IMPORTANT: Specific routes MUST come before parametric routes
// Otherwise /:id will catch everything

// Test endpoint
router.get('/test-railway-deployment', (_req, res) => {
  res.json({
    message: 'Railway deployment test successful - routes working!',
    version: '1.0.4',
    timestamp: new Date().toISOString()
  });
});

// Tax calculation endpoint (must be before /:id)
router.post('/calculate-tax', calculateTax);

// Create order endpoint (must be before /:id)
router.post('/create', createOrder);

// Capture payment for specific order
router.post('/:id/capture-payment', capturePayment);

// Get order by ID - MUST BE LAST (parametric route catches everything)
router.get('/:id', getOrder);

export default router;
