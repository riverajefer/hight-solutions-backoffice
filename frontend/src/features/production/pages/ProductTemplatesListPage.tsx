import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Category';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useProductTemplates, useDeleteProductTemplate } from '../hooks/useProduction';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import type { ProductTemplateSummary } from '../../../types/production.types';
import type { ResponsiveGridColDef } from '../../../hooks';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'cuadernos', label: 'Cuadernos' },
  { value: 'papeleria_impresa', label: 'Papelería impresa' },
  { value: 'revistas', label: 'Revistas / Catálogos' },
  { value: 'talonarios', label: 'Talonarios' },
  { value: 'otro', label: 'Otro' },
];

const ProductTemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission(PERMISSIONS.CREATE_PRODUCT_TEMPLATES);
  const canDelete = hasPermission(PERMISSIONS.DELETE_PRODUCT_TEMPLATES);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const templatesQuery = useProductTemplates(categoryFilter ? { category: categoryFilter } : undefined);
  const deleteTemplate = useDeleteProductTemplate();

  const templates: ProductTemplateSummary[] = templatesQuery.data || [];

  const columns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<ProductTemplateSummary>) => (
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{ cursor: 'pointer', color: 'primary.main' }}
            onClick={() =>
              navigate(ROUTES.PRODUCT_TEMPLATES_DETAIL.replace(':id', params.row.id))
            }
          >
            {params.row.name}
          </Typography>
        ),
      },
      {
        field: 'category',
        headerName: 'Categoría',
        width: 160,
        renderCell: (params: GridRenderCellParams<ProductTemplateSummary>) => (
          <Chip
            label={params.row.category}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        ),
      },
      {
        field: 'components',
        headerName: 'Componentes',
        width: 130,
        renderCell: (params: GridRenderCellParams<ProductTemplateSummary>) => (
          <Typography variant="body2">{params.row._count?.components ?? 0}</Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Estado',
        width: 110,
        renderCell: (params: GridRenderCellParams<ProductTemplateSummary>) => (
          <Chip
            label={params.row.isActive ? 'Activa' : 'Inactiva'}
            color={params.row.isActive ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Creada',
        width: 120,
        valueGetter: (_v: any, row: ProductTemplateSummary) =>
          new Date(row.createdAt).toLocaleDateString('es-CO'),
      },
    ],
    [navigate],
  );

  const handleRowClick = (id: string) => {
    navigate(ROUTES.PRODUCT_TEMPLATES_DETAIL.replace(':id', id));
  };

  return (
    <Box>
      <PageHeader
        title="Plantillas de Producto"
        subtitle="Define los procesos de fabricación reutilizables"
        icon={<InventoryIcon />}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.PRODUCT_TEMPLATES_CREATE)}
            >
              Nueva plantilla
            </Button>
          ) : undefined
        }
      />

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Categoría"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          size="small"
          sx={{ width: 220 }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        rows={templates}
        columns={columns}
        loading={templatesQuery.isLoading}
        onRowClick={(params) => handleRowClick(params.row.id)}
        getRowId={(row) => row.id}
      />

      {canDelete && (
        <ConfirmDialog
          open={!!deleteId}
          title="Desactivar plantilla"
          message="¿Deseas desactivar esta plantilla? No se eliminará, solo quedará inactiva."
          onConfirm={async () => {
            if (deleteId) {
              await deleteTemplate.mutateAsync(deleteId);
              setDeleteId(null);
            }
          }}
          onCancel={() => setDeleteId(null)}
          isLoading={deleteTemplate.isPending}
        />
      )}
    </Box>
  );
};

export default ProductTemplatesListPage;
