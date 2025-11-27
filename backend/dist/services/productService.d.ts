import { Product, Variant } from '../models/types';
/**
 * Get all products by status
 * @param status - Product status filter (default: 'active')
 * @returns Array of products
 */
export declare const getAllProducts: (status?: string) => Promise<Product[]>;
/**
 * Get product by slug
 * @param slug - Product slug (URL-friendly identifier)
 * @returns Product object or null if not found
 */
export declare const getProductBySlug: (slug: string) => Promise<Product | null>;
/**
 * Get product by ID
 * @param id - Product ID
 * @returns Product object or null if not found
 */
export declare const getProductById: (id: string) => Promise<Product | null>;
/**
 * Get all variants for a product
 * @param productId - Product ID
 * @returns Array of product variants (color/size combinations)
 */
export declare const getVariantsByProductId: (productId: string) => Promise<Variant[]>;
/**
 * Get variant by ID
 * @param id - Variant ID
 * @returns Variant object or null if not found
 */
export declare const getVariantById: (id: string) => Promise<Variant | null>;
/**
 * Create a new product
 * @param productData - Product data object
 * @returns Newly created product
 */
export declare const createProduct: (productData: any) => Promise<Product>;
/**
 * Update existing product
 * @param id - Product ID
 * @param productData - Product data to update
 * @returns Updated product object
 * @throws {ApiError} 404 if product not found
 */
export declare const updateProduct: (id: string, productData: Record<string, unknown>) => Promise<Product>;
/**
 * Delete (archive) a product
 * Sets product status to 'archived' instead of hard delete
 * @param id - Product ID
 * @throws {ApiError} 404 if product not found
 */
export declare const deleteProduct: (id: string) => Promise<void>;
//# sourceMappingURL=productService.d.ts.map