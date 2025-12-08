import { Router } from 'express';
import { createOrder, capturePayment, getOrder, calculateTax } from '../controllers/orderController';

const router = Router();

router.post('/calculate-tax', calculateTax);
router.post('/create', createOrder);
router.post('/:id/capture-payment', capturePayment);
router.get('/:id', getOrder);

export default router;
