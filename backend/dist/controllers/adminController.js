"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = exports.deleteProduct = exports.updateProduct = exports.createProduct = void 0;
const productService_1 = require("../services/productService");
const adminOrderService_1 = require("../services/adminOrderService");
const createProduct = async (req, res, next) => {
    try {
        const product = await (0, productService_1.createProduct)(req.body);
        res.status(201).json({
            success: true,
            data: { product }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await (0, productService_1.updateProduct)(id, req.body);
        res.status(200).json({
            success: true,
            data: { product }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        await (0, productService_1.deleteProduct)(id);
        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
const getAllOrders = async (req, res, next) => {
    try {
        const filters = req.query;
        // Use enhanced admin service with complete data joins
        const orders = await (0, adminOrderService_1.getAllOrdersForAdmin)(filters);
        res.status(200).json({
            success: true,
            data: { orders }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await (0, adminOrderService_1.getOrderByIdForAdmin)(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        res.status(200).json({
            success: true,
            data: { order }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, tracking_number, carrier, internal_notes } = req.body;
        // Use enhanced admin service
        const order = await (0, adminOrderService_1.updateOrderProductionStatusAdmin)(id, status, tracking_number, carrier, internal_notes);
        res.status(200).json({
            success: true,
            data: { order }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrderStatus = updateOrderStatus;
//# sourceMappingURL=adminController.js.map