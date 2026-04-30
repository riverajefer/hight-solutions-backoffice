import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, CircularProgress, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '../../../components/common/PageHeader';
import { DtfItemsTable } from '../components/DtfItemsTable';
import { useDtfMutations } from '../hooks/useDtf';
import { PATHS } from '../../../router/paths';
import { dtfApi } from '../../../api/dtf.api';
import type { DtfFormItem } from '../../../types/dtf.types';

const newItem = (): DtfFormItem => ({
  _localId: uuidv4(),
  productId: '',
  clientId: '',
  quantity: 0,
  notes: '',
  unitPrice: 0,
  value: 0,
  imageFile: null,
  imagePreviewUrl: null,
  comprobanteFile: null,
  comprobantePreviewUrl: null,
});

export const DtfFormPage = () => {
  const navigate = useNavigate();
  const { bulkCreate } = useDtfMutations();
  const [items, setItems] = useState<DtfFormItem[]>([newItem()]);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const unsavedItems = items.filter((i) => !i.id);
  const savedItems = items.filter((i) => !!i.id);

  const handleSaveItem = async (localId: string) => {
    const item = items.find((i) => i._localId === localId);
    if (!item) return;

    setSavingItemId(localId);
    try {
      const [created] = await bulkCreate.mutateAsync({
        items: [{ productId: item.productId, clientId: item.clientId, quantity: item.quantity, notes: item.notes || undefined }],
      });

      if (item.imageFile) {
        try { await dtfApi.uploadImage(created.id, item.imageFile); } catch { /* best effort */ }
      }
      if (item.comprobanteFile) {
        try { await dtfApi.uploadComprobante(created.id, item.comprobanteFile); } catch { /* best effort */ }
      }

      setItems((prev) =>
        prev.map((i) =>
          i._localId === localId
            ? { ...i, id: created.id, consecutive: created.consecutive, status: created.status }
            : i,
        ),
      );
    } finally {
      setSavingItemId(null);
    }
  };

  const handleSaveAll = async () => {
    for (const item of unsavedItems) {
      await handleSaveItem(item._localId);
    }
  };

  const allSaved = unsavedItems.length === 0 && savedItems.length > 0;

  return (
    <Box p={3}>
      <PageHeader
        title="Crear registros DTF"
        subtitle="Guarde cada ítem individualmente o todos a la vez"
        breadcrumbs={[
          { label: 'DTF', path: PATHS.DTF },
          { label: 'Crear' },
        ]}
      />

      {savedItems.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={1} mb={2} sx={{ color: 'success.main' }}>
          <CheckCircleOutlineIcon fontSize="small" />
          <Typography variant="body2">
            {savedItems.length} registro{savedItems.length > 1 ? 's' : ''} guardado{savedItems.length > 1 ? 's' : ''}
          </Typography>
        </Stack>
      )}

      <DtfItemsTable
        items={items}
        onChange={setItems}
        disabled={!!savingItemId}
        onSaveItem={handleSaveItem}
        savingItemId={savingItemId}
        onViewItem={(id) => navigate(PATHS.DTF_DETAIL.replace(':id', id))}
      />

      <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate(PATHS.DTF)}
        >
          {allSaved ? 'Volver al listado' : 'Cancelar'}
        </Button>

        {!allSaved && (
          <Button
            variant="contained"
            startIcon={
              bulkCreate.isPending && !savingItemId ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
            onClick={handleSaveAll}
            disabled={!!savingItemId || unsavedItems.every((i) => !i.productId || !i.clientId || i.quantity <= 0)}
          >
            Guardar todos ({unsavedItems.length})
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default DtfFormPage;
