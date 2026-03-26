import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  ClickAwayListener,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { commentsApi } from '../../../api';
import { CommentAuthor } from '../../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const MENTION_REGEX = /@(\w*)$/;

const getDisplayName = (author: CommentAuthor): string => {
  if (author.firstName) {
    return `${author.firstName}${author.lastName ? ` ${author.lastName}` : ''}`;
  }
  return author.username ?? '';
};

const getInitials = (author: CommentAuthor): string => {
  const f = author.firstName?.[0] ?? '';
  const l = author.lastName?.[0] ?? '';
  return (f + l).toUpperCase() || (author.username?.[0]?.toUpperCase() ?? '?');
};

// ─── component ───────────────────────────────────────────────────────────────

interface CommentInputProps {
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  parentId?: string;
  placeholder?: string;
  isLoading?: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  parentId,
  placeholder = 'Escribe un comentario... Usa @usuario para mencionar',
  isLoading = false,
  onCancel,
  autoFocus = false,
}) => {
  const [content, setContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<CommentAuthor[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const popoverOpen = mentionQuery !== null && (mentionUsers.length > 0 || mentionLoading);

  // ── Detect @mention trigger ────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    const cursor = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursor);
    const match = textBeforeCursor.match(MENTION_REGEX);

    if (match) {
      const query = match[1]; // text after @
      setMentionQuery(query);
      setSelectedIndex(0);

      // Debounce API call
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setMentionLoading(true);
        try {
          const results = await commentsApi.searchMentionable(query);
          setMentionUsers(results);
        } catch {
          setMentionUsers([]);
        } finally {
          setMentionLoading(false);
        }
      }, 200);
    } else {
      closeMentionPopover();
    }
  };

  const closeMentionPopover = useCallback(() => {
    setMentionQuery(null);
    setMentionUsers([]);
    setMentionLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // ── Insert selected user into textarea ────────────────────────────────────
  const selectUser = (user: CommentAuthor) => {
    const input = inputRef.current;
    if (!input) return;

    const cursor = input.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursor);
    const textAfterCursor = content.slice(cursor);

    // Replace the @partial text before cursor with @username + space
    const replaced = textBeforeCursor.replace(MENTION_REGEX, `@${user.username} `);
    const newContent = replaced + textAfterCursor;
    setContent(newContent);

    closeMentionPopover();

    // Restore focus and move cursor after the inserted mention
    requestAnimationFrame(() => {
      input.focus();
      const newCursor = replaced.length;
      input.setSelectionRange(newCursor, newCursor);
    });
  };

  // ── Keyboard navigation in mention popover ────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (popoverOpen && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, mentionUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectUser(mentionUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        closeMentionPopover();
        return;
      }
    }

    // Normal submit: Ctrl+Enter / Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await onSubmit(trimmed, parentId);
    setContent('');
    closeMentionPopover();
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ClickAwayListener onClickAway={closeMentionPopover}>
      <Box ref={anchorRef} sx={{ position: 'relative' }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 1.5, 
          alignItems: 'flex-end',
          bgcolor: 'background.paper',
          p: 1,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          transition: 'all 0.2s',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }
        }}>
        {/* Mention autocomplete popover */}
        <Popper
          open={popoverOpen}
          anchorEl={anchorRef.current}
          placement="top-start"
          style={{ zIndex: 1400, width: anchorRef.current?.offsetWidth ?? 300 }}
          modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}
        >
          <Paper elevation={4} sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
            {mentionLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <>
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Mencionar usuario{mentionQuery ? ` · "${mentionQuery}"` : ''}
                  </Typography>
                </Box>
                {mentionUsers.length === 0 ? (
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sin resultados
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding>
                    {mentionUsers.map((user, idx) => (
                      <ListItemButton
                        key={user.id}
                        selected={idx === selectedIndex}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur before click fires
                          selectUser(user);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        sx={{ px: 1.5, py: 0.75 }}
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar
                            src={user.profilePhoto || undefined}
                            sx={{ width: 28, height: 28, fontSize: 12 }}
                          >
                            {getInitials(user)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {getDisplayName(user)}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" noWrap>
                              @{user.username}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </>
            )}
          </Paper>
        </Popper>

        {/* Text input */}
        <TextField
          inputRef={inputRef}
          multiline
          maxRows={4}
          fullWidth
          size="small"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={isLoading}
          sx={{ 
            '& .MuiOutlinedInput-root': { 
              p: 1.5,
              '& fieldset': { border: 'none' },
            } 
          }}
        />

        {/* Send button */}
        <Tooltip title="Enviar (Ctrl+Enter)">
          <span>
            <IconButton
              color="primary"
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              size="medium"
              sx={{ 
                mb: 0.5,
                mr: 0.5,
                bgcolor: content.trim() ? 'primary.main' : 'action.selected',
                color: content.trim() ? 'primary.contrastText' : 'text.disabled',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        </Box>
      </Box>
    </ClickAwayListener>
  );
};
