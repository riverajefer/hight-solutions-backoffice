import React from 'react';
import { Box, ButtonGroup, Button, alpha } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: '7 días', getDates: () => ({ dateFrom: format(subDays(new Date(), 6), 'yyyy-MM-dd'), dateTo: format(new Date(), 'yyyy-MM-dd') }) },
  { label: '30 días', getDates: () => ({ dateFrom: format(subDays(new Date(), 29), 'yyyy-MM-dd'), dateTo: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Este mes', getDates: () => ({ dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'), dateTo: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Este año', getDates: () => ({ dateFrom: format(startOfYear(new Date()), 'yyyy-MM-dd'), dateTo: format(new Date(), 'yyyy-MM-dd') }) },
];

const NEON_COLOR = '#F97316';

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const activePreset = PRESETS.findIndex((p) => {
    const d = p.getDates();
    return d.dateFrom === value.dateFrom && d.dateTo === value.dateTo;
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <ButtonGroup size="small" variant="outlined">
          {PRESETS.map((preset, idx) => (
            <Button
              key={preset.label}
              onClick={() => onChange(preset.getDates())}
              sx={{
                textTransform: 'none',
                fontWeight: idx === activePreset ? 700 : 400,
                borderColor: idx === activePreset ? NEON_COLOR : 'divider',
                color: idx === activePreset ? NEON_COLOR : 'text.secondary',
                backgroundColor: idx === activePreset
                  ? (theme) => alpha(NEON_COLOR, theme.palette.mode === 'dark' ? 0.12 : 0.06)
                  : 'transparent',
                '&:hover': { borderColor: NEON_COLOR, color: NEON_COLOR },
              }}
            >
              {preset.label}
            </Button>
          ))}
        </ButtonGroup>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <DatePicker
            label="Desde"
            value={value.dateFrom ? new Date(value.dateFrom + 'T00:00:00') : null}
            onChange={(date) => {
              if (date) onChange({ ...value, dateFrom: format(date, 'yyyy-MM-dd') });
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { width: 150 },
              },
            }}
          />
          <DatePicker
            label="Hasta"
            value={value.dateTo ? new Date(value.dateTo + 'T00:00:00') : null}
            onChange={(date) => {
              if (date) onChange({ ...value, dateTo: format(date, 'yyyy-MM-dd') });
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { width: 150 },
              },
            }}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  );
};
