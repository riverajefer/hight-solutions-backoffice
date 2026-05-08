import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { storageApi } from '../../../api/storage.api';
import { formatDate } from '../../../utils/formatters';
import type { AccountPayable } from '../../../types/accounts-payable.types';
import { useAccountPayable } from '../hooks/useAccountsPayable';

interface Props {
  accountPayable: AccountPayable;
  canEdit: boolean;
}

function fileIcon(fileType?: string | null) {
  if (!fileType) return <InsertDriveFileIcon fontSize="small" />;
  if (fileType.startsWith('image/')) return <ImageIcon fontSize="small" color="info" />;
  if (fileType === 'application/pdf') return <PictureAsPdfIcon fontSize="small" color="error" />;
  return <InsertDriveFileIcon fontSize="small" />;
}

export const AttachmentsSection: React.FC<Props> = ({ accountPayable, canEdit }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { addAttachmentMutation, deleteAttachmentMutation } = useAccountPayable(accountPayable.id);

  const attachments = accountPayable.attachments ?? [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await storageApi.uploadFile(file, {
        entityType: 'account_payable',
        entityId: accountPayable.id,
      });
      await addAttachmentMutation.mutateAsync({
        storageFileId: uploaded.id,
        fileName: uploaded.originalName,
        fileUrl: uploaded.url,
        fileType: uploaded.mimeType,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600}>
            Adjuntos
          </Typography>
          {attachments.length > 0 && (
            <Chip label={attachments.length} size="small" />
          )}
        </Stack>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileChange}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={uploading ? <CircularProgress size={14} /> : <AttachFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Adjuntar
            </Button>
          </>
        )}
      </Stack>

      {attachments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Sin adjuntos. {canEdit && 'Puedes adjuntar facturas, contratos u otros documentos.'}
        </Typography>
      ) : (
        <List dense disablePadding>
          {attachments.map((att) => (
            <ListItem
              key={att.id}
              disablePadding
              sx={{
                borderRadius: 1,
                mb: 0.5,
                px: 1,
                py: 0.5,
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Abrir archivo">
                    <IconButton
                      size="small"
                      component="a"
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {canEdit && (
                    <Tooltip title="Eliminar adjunto">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deleteAttachmentMutation.isPending}
                        onClick={() => deleteAttachmentMutation.mutate(att.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              }
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {fileIcon(att.fileType)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                    {att.fileName}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {[att.uploadedBy.firstName, att.uploadedBy.lastName].filter(Boolean).join(' ')}
                    {' · '}
                    {formatDate(att.createdAt)}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
