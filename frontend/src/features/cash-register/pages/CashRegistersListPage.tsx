import React, { useMemo, useState } from 'react';
import { Box, Chip } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { useResponsiveColumns } from '../../../hooks';
import type { ResponsiveGridColDef } from '../../../hooks';
import { useCashRegisters, useCashMutations } from '../hooks/useCashRegister';
import CashRegisterFormDialog from '../components/CashRegisterFormDialog';
import type { CashRegister } from '../../../types/cash-register.types';

const CashRegistersListPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CashRegister | null>(null);

  const registersQuery = useCashRegisters();
  const { createRegister, updateRegister, deleteRegister } = useCashMutations();
  const registers = registersQuery.data || [];

  const handleOpenCreate = () => {
    setEditingRegister(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (register: CashRegister) => {
    setEditingRegister(register);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingRegister(null);
  };

  const handleFormSubmit = async (data: {
    name: string;
    description?: string;
    isActive: boolean;
  }) => {
    if (editingRegister) {
      await updateRegister.mutateAsync({ id: editingRegister.id, dto: data });
    } else {
      await createRegister.mutateAsync(data);
    }
    handleCloseForm();
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    await deleteRegister.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const rawColumns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'description',
        headerName: 'Descripción',
        flex: 1.5,
        minWidth: 200,
        responsive: 'md' as const,
        valueFormatter: (value: string | undefined) => value || '—',
      },
      {
        field: '_count',
        headerName: 'Sesiones abiertas',
        width: 160,
        align: 'center' as const,
        headerAlign: 'center' as const,
        responsive: 'sm' as const,
        renderCell: (params: GridRenderCellParams) => {
          const count = params.value?.sessions ?? 0;
          return (
            <Chip
              label={count === 0 ? 'Sin sesión' : `${count} abierta${count > 1 ? 's' : ''}`}
              size="small"
              color={count > 0 ? 'warning' : 'default'}
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'isActive',
        headerName: 'Estado',
        width: 110,
        align: 'center' as const,
        headerAlign: 'center' as const,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value ? 'Activa' : 'Inactiva'}
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
        renderCell: (params: GridRenderCellParams<CashRegister>) => (
          <ActionsCell
            onEdit={
              hasPermission(PERMISSIONS.UPDATE_CASH_REGISTERS)
                ? () => handleOpenEdit(params.row)
                : undefined
            }
            onDelete={
              hasPermission(PERMISSIONS.DELETE_CASH_REGISTERS)
                ? () => setConfirmDelete(params.row)
                : undefined
            }
          />
        ),
      },
    ],
    [hasPermission],
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Cajas Registradoras"
        subtitle="Gestiona las cajas registradoras del sistema"
      />

      <DataTable
        rows={registers}
        columns={columns}
        loading={registersQuery.isLoading}
        onAdd={
          hasPermission(PERMISSIONS.CREATE_CASH_REGISTERS)
            ? handleOpenCreate
            : undefined
        }
        addButtonText="Nueva Caja"
        searchPlaceholder="Buscar cajas..."
      />

      <CashRegisterFormDialog
        open={formOpen}
        register={editingRegister}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        isLoading={createRegister.isPending || updateRegister.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Caja Registradora"
        message={`¿Estás seguro de que deseas eliminar la caja "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteRegister.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default CashRegistersListPage;
