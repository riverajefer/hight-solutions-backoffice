import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '../../../components/common/PageHeader';
import { DtfItemsTable } from '../components/DtfItemsTable';
import { useDtfMutations } from '../hooks/useDtf';
import { PATHS } from '../../../router/paths';
import type { DtfFormItem } from '../../../types/dtf.types';
import { dtfApi } from '../../../api/dtf.api';

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
  const [uploading, setUploading] = useState(false);

  const isValid = items.every(
    (item) => item.productId && item.clientId && item.quantity > 0,
  );

  const handleSubmit = async () => {
    if (!isValid) return;
    const created = await bulkCreate.mutateAsync({
      items: items.map(({ productId, clientId, quantity, notes }) => ({
        productId,
        clientId,
        quantity,
        notes: notes || undefined,
      })),
    });

    const hasFiles = items.some((i) => i.imageFile || i.comprobanteFile);
    if (hasFiles && Array.isArray(created)) {
      setUploading(true);
      try {
        await Promise.allSettled(
          items.flatMap((item, idx) => {
            const record = created[idx];
            if (!record?.id) return [];
            const uploads: Promise<unknown>[] = [];
            if (item.imageFile) uploads.push(dtfApi.uploadImage(record.id, item.imageFile));
            if (item.comprobanteFile) uploads.push(dtfApi.uploadComprobante(record.id, item.comprobanteFile));
            return uploads;
          }),
        );
      } finally {
        setUploading(false);
      }
    }

    navigate(PATHS.DTF);
  };

  return (
    <Box p={3}>
      <PageHeader
        title="Crear registros DTF"
        subtitle="Agregue uno o más ítems DTF y guarde en lote"
      />

      <DtfItemsTable
        items={items}
        onChange={setItems}
        disabled={bulkCreate.isPending || uploading}
      />

      <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate(PATHS.DTF)}
          disabled={bulkCreate.isPending || uploading}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={
            bulkCreate.isPending || uploading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={handleSubmit}
          disabled={!isValid || bulkCreate.isPending || uploading}
        >
          {uploading ? 'Subiendo archivos...' : `Guardar ${items.length > 1 ? `(${items.length} ítems)` : ''}`}
        </Button>
      </Stack>
    </Box>
  );
};

export default DtfFormPage;
