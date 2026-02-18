import axiosInstance from './axios';
import {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryListResponse,
} from '../types/product-category.types';

export interface ProductCategoryQueryParams {
  includeInactive?: boolean;
}

export const productCategoriesApi = {
  /**
   * Get all product categories
   */
  getAll: async (
    params?: ProductCategoryQueryParams
  ): Promise<ProductCategoryListResponse> => {
    const response = await axiosInstance.get<ProductCategoryListResponse>(
      '/product-categories',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single product category by ID
   */
  getById: async (id: string): Promise<ProductCategory> => {
    const response = await axiosInstance.get<ProductCategory>(
      `/product-categories/${id}`
    );
    return response.data;
  },

  /**
   * Create a new product category
   */
  create: async (data: CreateProductCategoryDto): Promise<ProductCategory> => {
    const response = await axiosInstance.post<ProductCategory>(
      '/product-categories',
      data
    );
    return response.data;
  },

  /**
   * Update an existing product category
   */
  update: async (
    id: string,
    data: UpdateProductCategoryDto
  ): Promise<ProductCategory> => {
    const response = await axiosInstance.put<ProductCategory>(
      `/product-categories/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a product category (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/product-categories/${id}`
    );
    return response.data;
  },
};
