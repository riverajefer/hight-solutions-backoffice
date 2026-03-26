import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { CommentEntityType, CreateCommentDto } from '../../../types';
import { useComments } from '../hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';

interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ entityType, entityId }) => {
  const { hasPermission } = useAuthStore();
  const { commentsQuery, createMutation, deleteMutation } = useComments(entityType, entityId);

  const canRead = hasPermission(PERMISSIONS.READ_COMMENTS);
  const canCreate = hasPermission(PERMISSIONS.CREATE_COMMENTS);

  if (!canRead) return null;

  const comments = commentsQuery.data ?? [];

  const handleSubmit = async (content: string, parentId?: string) => {
    const dto: CreateCommentDto = { content, entityType, entityId };
    if (parentId) dto.parentId = parentId;
    await createMutation.mutateAsync(dto);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Card sx={{ mt: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <ChatBubbleOutlineIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
            Comentarios
            {comments.length > 0 && (
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ ml: 1, fontWeight: 500 }}
              >
                ({comments.length})
              </Typography>
            )}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3, opacity: 0.6 }} />

        {/* Loading */}
        {commentsQuery.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {/* Error */}
        {commentsQuery.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error al cargar los comentarios. Intenta recargar la página.
          </Alert>
        )}

        {/* Empty state */}
        {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 4 }}
          >
            No hay comentarios aún. ¡Sé el primero en comentar!
          </Typography>
        )}

        {/* Comment list */}
        {comments.length > 0 && (
          <Box sx={{ maxHeight: 520, overflowY: 'auto', pr: 0.5 }}>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDelete}
                onReply={handleSubmit}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </Box>
        )}

        {/* Input */}
        {canCreate && (
          <>
            <Divider sx={{ mt: 2, mb: 2 }} />
            <CommentInput
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
