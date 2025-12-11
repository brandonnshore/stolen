"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const router = (0, express_1.Router)();
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
router.post('/calculate-tax', orderController_1.calculateTax);
// Create order endpoint (must be before /:id)
router.post('/create', orderController_1.createOrder);
// Capture payment for specific order
router.post('/:id/capture-payment', orderController_1.capturePayment);
// Get order by ID - MUST BE LAST (parametric route catches everything)
router.get('/:id', orderController_1.getOrder);
exports.default = router;
//# sourceMappingURL=orders.js.map