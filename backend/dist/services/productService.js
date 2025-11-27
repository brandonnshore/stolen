"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getVariantById = exports.getVariantsByProductId = exports.getProductById = exports.getProductBySlug = exports.getAllProducts = void 0;
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Get all products by status
 * @param status - Product status filter (default: 'active')
 * @returns Array of products
 */
const getAllProducts = async (status = 'active') => {
    const result = await database_1.default.query('SELECT * FROM products WHERE status = $1 ORDER BY created_at DESC', [status]);
    return result.rows;
};
exports.getAllProducts = getAllProducts;
/**
 * Get product by slug
 * @param slug - Product slug (URL-friendly identifier)
 * @returns Product object or null if not found
 */
const getProductBySlug = async (slug) => {
    const result = await database_1.default.query('SELECT * FROM products WHERE slug = $1 AND status = $2', [slug, 'active']);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getProductBySlug = getProductBySlug;
/**
 * Get product by ID
 * @param id - Product ID
 * @returns Product object or null if not found
 */
const getProductById = async (id) => {
    const result = await database_1.default.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getProductById = getProductById;
/**
 * Get all variants for a product
 * @param productId - Product ID
 * @returns Array of product variants (color/size combinations)
 */
const getVariantsByProductId = async (productId) => {
    const result = await database_1.default.query('SELECT * FROM variants WHERE product_id = $1 ORDER BY color, size', [productId]);
    return result.rows;
};
exports.getVariantsByProductId = getVariantsByProductId;
/**
 * Get variant by ID
 * @param id - Variant ID
 * @returns Variant object or null if not found
 */
const getVariantById = async (id) => {
    const result = await database_1.default.query('SELECT * FROM variants WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getVariantById = getVariantById;
/**
 * Create a new product
 * @param productData - Product data object
 * @returns Newly created product
 */
const createProduct = async (productData) => {
    const { title, slug, description, images, materials, weight, country_of_origin } = productData;
    const result = await database_1.default.query(`INSERT INTO products (title, slug, description, images, materials, weight, country_of_origin, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
     RETURNING *`, [title, slug, description, JSON.stringify(images || []), materials, weight, country_of_origin]);
    return result.rows[0];
};
exports.createProduct = createProduct;
/**
 * Update existing product
 * @param id - Product ID
 * @param productData - Product data to update
 * @returns Updated product object
 * @throws {ApiError} 404 if product not found
 */
const updateProduct = async (id, productData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    Object.keys(productData).forEach((key) => {
        if (key === 'images') {
            fields.push(`${key} = $${paramCount}`);
            values.push(JSON.stringify(productData[key]));
        }
        else {
            fields.push(`${key} = $${paramCount}`);
            values.push(productData[key]);
        }
        paramCount++;
    });
    values.push(id);
    const result = await database_1.default.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
    if (result.rows.length === 0) {
        throw new errorHandler_1.ApiError(404, 'Product not found');
    }
    return result.rows[0];
};
exports.updateProduct = updateProduct;
/**
 * Delete (archive) a product
 * Sets product status to 'archived' instead of hard delete
 * @param id - Product ID
 * @throws {ApiError} 404 if product not found
 */
const deleteProduct = async (id) => {
    const result = await database_1.default.query(`UPDATE products SET status = 'archived' WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.ApiError(404, 'Product not found');
    }
};
exports.deleteProduct = deleteProduct;
//# sourceMappingURL=productService.js.map