import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productsApi,
  ProductQueryParams,
} from '../../../../api/products.api';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../../../../types/product.types';

/**
 * Custom hook for Products list and mutations
 */
export const useProducts = (params?: ProductQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all products
  const productsQuery = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params),
  });

  // Mutation for creating a product
  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductDto) =>
      productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Mutation for updating a product
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Mutation for deleting a product
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    productsQuery,
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
  };
};

/**
 * Custom hook for fetching a single product
 */
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
