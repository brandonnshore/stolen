import { Request, Response, NextFunction } from 'express';
import { createProduct as createProductService, updateProduct as updateProductService, deleteProduct as deleteProductService } from '../services/productService';
import { getAllOrders as getAllOrdersService, updateOrderProductionStatus } from '../services/orderService';
import { getAllOrdersForAdmin, getOrderByIdForAdmin, updateOrderProductionStatusAdmin } from '../services/adminOrderService';

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await createProductService(req.body);

    res.status(201).json({
      success: true,
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await updateProductService(id, req.body);

    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await deleteProductService(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = req.query;
    // Use enhanced admin service with complete data joins
    const orders = await getAllOrdersForAdmin(filters);

    res.status(200).json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await getOrderByIdForAdmin(id);

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
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, carrier, internal_notes } = req.body;

    // Use enhanced admin service
    const order = await updateOrderProductionStatusAdmin(
      id,
      status,
      tracking_number,
      carrier,
      internal_notes
    );

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};
