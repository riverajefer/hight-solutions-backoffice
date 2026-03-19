import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { FieldLibraryItem } from './FieldLibraryItem';
import {
  FIELD_TYPE_DEFINITIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type FieldTypeDefinition,
} from './fieldTypes';

export const FieldLibrary: React.FC = () => {
  const grouped = CATEGORY_ORDER.reduce<Record<string, FieldTypeDefinition[]>>((acc, cat) => {
    acc[cat] = FIELD_TYPE_DEFINITIONS.filter((d) => d.category === cat);
    return acc;
  }, {});

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        overflowY: 'auto',
        p: 1.5,
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
        Tipos de campo
      </Typography>

      {CATEGORY_ORDER.map((cat) => (
        <Box key={cat} mb={1.5}>
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {CATEGORY_LABELS[cat]}
          </Typography>
          <Divider sx={{ mb: 0.5, mt: 0.25 }} />
          {grouped[cat].map((def) => (
            <FieldLibraryItem key={def.type} fieldTypeDef={def} />
          ))}
        </Box>
      ))}
    </Box>
  );
};
