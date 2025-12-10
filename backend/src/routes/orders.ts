import { Router } from 'express';
import { createOrder, capturePayment, getOrder, calculateTax } from '../controllers/orderController';

const router = Router();

// DIAGNOSTIC: Test route to verify Railway is picking up changes
router.get('/test-railway-deployment', (_req, res) => {
  res.json({
    message: 'Railway deployment test successful',
    version: '1.0.3',
    timestamp: new Date().toISOString()
  });
});

router.post('/calculate-tax', calculateTax);
router.post('/create', createOrder);
router.post('/:id/capture-payment', capturePayment);
router.get('/:id', getOrder);

export default router;
