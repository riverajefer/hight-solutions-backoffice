import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  FilterAltOff as ClearFiltersIcon,
  Groups as AdvisorViewIcon,
  Search as SearchIcon,
  ViewColumn as StatusViewIcon,
} from '@mui/icons-material';
import type {
  BoardFilters,
  BoardView,
  ProductionBoardArea,
} from '../../../types/production-board.types';
import { formatCurrencyInput, sanitizeCurrencyInput } from '../../../utils/currencyInput';

interface BoardFiltersBarProps {
  filters: BoardFilters;
  advisorOptions: { id: string; name: string }[];
  areaOptions: ProductionBoardArea[];
  activeFiltersCount: number;
  onChange: (changes: Partial<BoardFilters>) => void;
  onClear: () => void;
}

export const BoardFiltersBar: React.FC<BoardFiltersBarProps> = ({
  filters,
  advisorOptions,
  areaOptions,
  activeFiltersCount,
  onChange,
  onClear,
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <ToggleButtonGroup
      size="small"
      exclusive
      value={filters.view}
      onChange={(_, view: BoardView | null) => view && onChange({ view })}
      aria-label="Vista del tablero"
    >
      <ToggleButton value="status">
        <StatusViewIcon fontSize="small" sx={{ mr: 0.5 }} />
        Por estado
      </ToggleButton>
      <ToggleButton value="advisor">
        <AdvisorViewIcon fontSize="small" sx={{ mr: 0.5 }} />
        Por asesor
      </ToggleButton>
    </ToggleButtonGroup>

    <TextField
      size="small"
      placeholder="Buscar OP o cliente"
      value={filters.search}
      onChange={(event) => onChange({ search: event.target.value })}
      sx={{ width: { xs: '100%', sm: 200 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
    />

    <Autocomplete
      multiple
      size="small"
      limitTags={1}
      options={advisorOptions}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={advisorOptions.filter((option) => filters.advisorIds.includes(option.id))}
      onChange={(_, selected) => onChange({ advisorIds: selected.map((option) => option.id) })}
      renderInput={(params) => <TextField {...params} label="Asesores" />}
      sx={{ width: { xs: '100%', sm: 240 } }}
    />

    <Autocomplete
      size="small"
      options={areaOptions}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={areaOptions.find((option) => option.id === filters.areaId) ?? null}
      onChange={(_, selected) => onChange({ areaId: selected?.id ?? null })}
      renderInput={(params) => <TextField {...params} label="Área de producción" />}
      sx={{ width: { xs: '100%', sm: 220 } }}
    />

    <TextField
      size="small"
      label="Valor mínimo"
      value={formatCurrencyInput(filters.minTotal)}
      onChange={(event) => onChange({ minTotal: sanitizeCurrencyInput(event.target.value) })}
      inputProps={{ inputMode: 'numeric' }}
      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
      sx={{ width: { xs: '100%', sm: 160 } }}
    />

    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={filters.hideCounterSales}
          onChange={(event) => onChange({ hideCounterSales: event.target.checked })}
        />
      }
      label="Ocultar mostrador"
    />
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={filters.showDrafts}
          onChange={(event) => onChange({ showDrafts: event.target.checked })}
        />
      }
      label="Mostrar borradores"
    />

    {activeFiltersCount > 0 && (
      <Button size="small" color="warning" startIcon={<ClearFiltersIcon />} onClick={onClear}>
        Quitar filtros ({activeFiltersCount})
      </Button>
    )}
  </Box>
);
