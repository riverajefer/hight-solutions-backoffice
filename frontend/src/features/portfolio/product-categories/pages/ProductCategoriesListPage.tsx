import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../../components/common/DataTable';
import { useProductCategories } from '../hooks/useProductCategories';
import { ProductCategory } from '../../../../types/product-category.types';
import { ROUTES } from '../../../../utils/constants';

const ProductCategoriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<ProductCategory | null>(null);

  const { productCategoriesQuery, deleteProductCategoryMutation } = useProductCategories();
  const productCategories = productCategoriesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProductCategoryMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Categoría de producto eliminada correctamente', {
        variant: 'success',
      });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al eliminar categoría de producto';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  // Define columns for DataTable
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'slug',
      headerName: 'Slug',
      width: 150,
    },
    {
      field: 'description',
      headerName: 'Descripción',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'sortOrder',
      headerName: 'Orden',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'productsCount',
      headerName: 'Productos',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Activo' : 'Inactivo'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<ProductCategory>) => (
        <ActionsCell
          onEdit={() => navigate(`${ROUTES.PRODUCT_CATEGORIES}/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Categorías de Productos"
        subtitle="Gestiona las categorías de productos del sistema"
      />

      <DataTable
        rows={productCategories}
        columns={columns}
        loading={productCategoriesQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.PRODUCT_CATEGORIES}/new`)}
        addButtonText="Nueva Categoría"
        searchPlaceholder="Buscar categorías..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Categoría de Producto"
        message={`¿Estás seguro de que deseas eliminar la categoría "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteProductCategoryMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default ProductCategoriesListPage;
