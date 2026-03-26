import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplyIcon from '@mui/icons-material/Reply';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { Comment, CommentReply } from '../../../types';
import { CommentInput } from './CommentInput';
import { useUsers } from '../../users/hooks/useUsers';

const MentionTag: React.FC<{ username: string }> = ({ username }) => {
  const { usersQuery } = useUsers();
  
  // Extraemos usuarios de la caché (viene paginado si aplica o en forma de arreglo)
  const usersArray = Array.isArray(usersQuery.data) 
    ? usersQuery.data 
    : (usersQuery.data?.data || []);
    
  const mentionedUser = usersArray.find((u: any) => u.username === username);

  if (!mentionedUser) {
    return (
      <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
        @{username}
      </Typography>
    );
  }

  const fullName = [mentionedUser.firstName, mentionedUser.lastName].filter(Boolean).join(' ') || mentionedUser.username;

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5, minWidth: 150 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar 
              src={mentionedUser.profilePhoto || undefined} 
              sx={{ width: 32, height: 32, fontSize: 13 }}
            >
              {(mentionedUser.firstName?.[0] || mentionedUser.username?.[0] || '?').toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {fullName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                @{mentionedUser.username}
              </Typography>
            </Box>
          </Box>
          
          {(mentionedUser.role?.name || mentionedUser.cargo?.name) && (
            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          )}
          
          {mentionedUser.role?.name && (
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              <b>Rol:</b> {mentionedUser.role.name}
            </Typography>
          )}
          {mentionedUser.cargo?.name && (
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              <b>Cargo:</b> {mentionedUser.cargo.name}
            </Typography>
          )}
          {mentionedUser.cargo?.productionArea?.name && (
            <Typography variant="caption" display="block">
              <b>Área:</b> {mentionedUser.cargo.productionArea.name}
            </Typography>
          )}
        </Box>
      }
      arrow
      placement="top"
    >
      <Typography
        component="span"
        sx={{
          color: 'primary.main',
          fontWeight: 700,
          cursor: 'pointer',
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          mx: -0.25,
          transition: 'background-color 0.2s',
          '&:hover': { 
            bgcolor: 'primary.lighter',
            textDecoration: 'underline' 
          }
        }}
      >
        @{username}
      </Typography>
    </Tooltip>
  );
};

const renderContentWithMentions = (text: string) =>
  text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@') ? (
      <MentionTag key={i} username={part.substring(1)} />
    ) : (
      <span key={i}>{part}</span>
    ),
  );

const formatTimestamp = (iso: string): string =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));

const getInitials = (author: Comment['author']): string => {
  const first = author.firstName?.[0] ?? '';
  const last = author.lastName?.[0] ?? '';
  return (first + last).toUpperCase() || (author.username?.[0]?.toUpperCase() ?? '?');
};

const getDisplayName = (author: Comment['author']): string => {
  if (author.firstName) {
    return `${author.firstName}${author.lastName ? ` ${author.lastName}` : ''}`;
  }
  return author.username ?? 'Usuario';
};

interface ReplyItemProps {
  reply: CommentReply;
  onDelete: (id: string) => void;
  currentUserId?: string;
  canDeleteAny: boolean;
}

const ReplyItem: React.FC<ReplyItemProps> = ({ reply, onDelete, currentUserId, canDeleteAny }) => {
  const isOwner = currentUserId === reply.author.id;
  const canDelete = isOwner || canDeleteAny;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
      <Avatar
        src={reply.author.profilePhoto || undefined}
        sx={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}
      >
        {getInitials(reply.author)}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: isOwner ? 'primary.main' : 'divider',
            borderRadius: isOwner ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
            px: 1.5,
            py: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
            <Typography variant="subtitle2" fontWeight={600} fontSize={13} color={isOwner ? 'primary.main' : 'text.primary'}>
              {getDisplayName(reply.author)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {formatTimestamp(reply.createdAt)}
            </Typography>
          </Stack>
          <Typography variant="body2" fontSize={13} sx={{ lineHeight: 1.5, color: 'text.secondary' }}>
            {reply.deletedAt ? (
              <em style={{ opacity: 0.5 }}>[mensaje eliminado]</em>
            ) : (
              renderContentWithMentions(reply.content)
            )}
          </Typography>
        </Paper>
        {!reply.deletedAt && canDelete && (
          <Box sx={{ mt: 0.5, ml: 0.5 }}>
            <Tooltip title="Eliminar respuesta">
              <IconButton 
                size="small" 
                onClick={() => onDelete(reply.id)}
                sx={{ '&:hover': { color: 'error.main', bgcolor: 'error.lighter' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface CommentItemProps {
  comment: Comment;
  onDelete: (id: string) => void;
  onReply: (content: string, parentId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onDelete,
  onReply,
  isDeleting,
}) => {
  const { user, hasPermission } = useAuthStore();
  const [showReplyInput, setShowReplyInput] = useState(false);

  const isOwner = user?.id === comment.author.id;
  const canDeleteAny = hasPermission(PERMISSIONS.DELETE_COMMENTS);
  const canDelete = isOwner || canDeleteAny;
  const isDeleted = Boolean(comment.deletedAt);

  const handleReplySubmit = async (content: string, parentId?: string) => {
    await onReply(content, parentId!);
    setShowReplyInput(false);
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Avatar
          src={comment.author.profilePhoto || undefined}
          sx={{ 
            width: 38, 
            height: 38, 
            fontSize: 14, 
            flexShrink: 0,
            border: '2px solid',
            borderColor: 'background.paper',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {getInitials(comment.author)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          {/* Bubble */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: isOwner ? 'primary.main' : 'divider',
              borderRadius: isOwner ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              px: 2.5,
              py: 2,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color={isOwner ? 'primary.main' : 'text.primary'}>
                {getDisplayName(comment.author)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                {formatTimestamp(comment.createdAt)}
              </Typography>
              {isOwner && (
                <Box sx={{ ml: 'auto !important' }}>
                  <Typography variant="caption" sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText',
                    px: 1, 
                    py: 0.2, 
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    fontWeight: 600
                  }}>
                    Tú
                  </Typography>
                </Box>
              )}
            </Stack>
            <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary', fontSize: 14 }}>
              {isDeleted ? (
                <em style={{ opacity: 0.5 }}>[mensaje eliminado]</em>
              ) : (
                renderContentWithMentions(comment.content)
              )}
            </Typography>
          </Paper>

          {/* Actions */}
          {!isDeleted && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, ml: 1, mb: 1 }}>
              <Tooltip title="Responder">
                <IconButton 
                  size="small" 
                  onClick={() => setShowReplyInput((v) => !v)}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' }
                  }}
                >
                  <ReplyIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption" fontWeight={600}>Responder</Typography>
                </IconButton>
              </Tooltip>
              {canDelete && (
                <Tooltip title="Eliminar comentario">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(comment.id)}
                    disabled={isDeleting}
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main', bgcolor: 'error.lighter' }
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}

          {/* Reply input */}
          <Collapse in={showReplyInput}>
            <Box sx={{ mt: 1, ml: 0.5 }}>
              <CommentInput
                onSubmit={handleReplySubmit}
                parentId={comment.id}
                placeholder="Escribe una respuesta... Usa @usuario para mencionar"
                autoFocus
                onCancel={() => setShowReplyInput(false)}
              />
            </Box>
          </Collapse>

          {/* Replies */}
          {comment.replies.length > 0 && (
            <Box
              sx={{
                mt: 1.5,
                ml: 1,
                pl: 2,
                borderLeft: '2px solid',
                borderColor: 'divider',
              }}
            >
              {comment.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  onDelete={onDelete}
                  currentUserId={user?.id}
                  canDeleteAny={canDeleteAny}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
