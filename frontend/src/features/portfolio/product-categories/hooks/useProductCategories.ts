import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productCategoriesApi,
  ProductCategoryQueryParams,
} from '../../../../api/product-categories.api';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '../../../../types/product-category.types';

/**
 * Custom hook for Product Categories list and mutations
 */
export const useProductCategories = (params?: ProductCategoryQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all product categories
  const productCategoriesQuery = useQuery({
    queryKey: ['product-categories', params],
    queryFn: () => productCategoriesApi.getAll(params),
  });

  // Mutation for creating a product category
  const createProductCategoryMutation = useMutation({
    mutationFn: (data: CreateProductCategoryDto) =>
      productCategoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
  });

  // Mutation for updating a product category
  const updateProductCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductCategoryDto }) =>
      productCategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
  });

  // Mutation for deleting a product category
  const deleteProductCategoryMutation = useMutation({
    mutationFn: (id: string) => productCategoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
  });

  return {
    productCategoriesQuery,
    createProductCategoryMutation,
    updateProductCategoryMutation,
    deleteProductCategoryMutation,
  };
};

/**
 * Custom hook for fetching a single product category
 */
export const useProductCategory = (id: string) => {
  return useQuery({
    queryKey: ['product-categories', id],
    queryFn: () => productCategoriesApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
