import axiosInstance from './axios';
import {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductListResponse,
} from '../types/product.types';

export interface ProductQueryParams {
  includeInactive?: boolean;
  categoryId?: string;
}

export const productsApi = {
  /**
   * Get all products
   */
  getAll: async (
    params?: ProductQueryParams
  ): Promise<ProductListResponse> => {
    const response = await axiosInstance.get<ProductListResponse>(
      '/products',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single product by ID
   */
  getById: async (id: string): Promise<Product> => {
    const response = await axiosInstance.get<Product>(
      `/products/${id}`
    );
    return response.data;
  },

  /**
   * Create a new product
   */
  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await axiosInstance.post<Product>(
      '/products',
      data
    );
    return response.data;
  },

  /**
   * Update an existing product
   */
  update: async (
    id: string,
    data: UpdateProductDto
  ): Promise<Product> => {
    const response = await axiosInstance.put<Product>(
      `/products/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a product (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/products/${id}`
    );
    return response.data;
  },
};
