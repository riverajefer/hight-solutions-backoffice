import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  InputBase,
  Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'CO', name: 'Colombia', dialCode: '57', flag: '🇨🇴' },
  { code: 'US', name: 'Estados Unidos', dialCode: '1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canadá', dialCode: '1', flag: '🇨🇦' },
  { code: 'MX', name: 'México', dialCode: '52', flag: '🇲🇽' },
  { code: 'ES', name: 'España', dialCode: '34', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', dialCode: '54', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', dialCode: '55', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', dialCode: '56', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', dialCode: '51', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', dialCode: '58', flag: '🇻🇪' },
  { code: 'EC', name: 'Ecuador', dialCode: '593', flag: '🇪🇨' },
  { code: 'PA', name: 'Panamá', dialCode: '507', flag: '🇵🇦' },
  { code: 'GB', name: 'Reino Unido', dialCode: '44', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemania', dialCode: '49', flag: '🇩🇪' },
  { code: 'FR', name: 'Francia', dialCode: '33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italia', dialCode: '39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', dialCode: '351', flag: '🇵🇹' },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Colombia (+57)

export function parsePhoneValue(value: string): { country: Country; local: string } {
  if (!value) return { country: DEFAULT_COUNTRY, local: '' };
  // Match longest dial code first to avoid false positives (e.g. "593" before "57")
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (value.startsWith(c.dialCode)) {
      return { country: c, local: value.slice(c.dialCode.length) };
    }
  }
  // Fallback: assume Colombia and display value as-is (backward compat with old 10-digit records)
  return { country: DEFAULT_COUNTRY, local: value };
}

export interface PhoneInputWithCountryProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  value,
  onChange,
  label = 'Número de celular',
  required = false,
  error = false,
  helperText,
  fullWidth = true,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const initial = parsePhoneValue(value);
  const [selectedCountry, setSelectedCountry] = useState<Country>(initial.country);
  const [localNumber, setLocalNumber] = useState<string>(initial.local);

  // Sync state when the external value changes (e.g. form reset in edit mode)
  useEffect(() => {
    const parsed = parsePhoneValue(value);
    setSelectedCountry(parsed.country);
    setLocalNumber(parsed.local);
  }, [value]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setAnchorEl(null);
    setSearch('');
    onChange(country.dialCode + localNumber);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    setLocalNumber(digits);
    onChange(selectedCountry.dialCode + digits);
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box sx={{ width: fullWidth ? '100%' : undefined }}>
      <TextField
        fullWidth={fullWidth}
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        disabled={disabled}
        value={localNumber}
        onChange={handleLocalChange}
        placeholder={selectedCountry.code === 'CO' ? '3001234567' : ''}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0 }}>
              <Button
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                disabled={disabled}
                sx={{
                  minWidth: 'unset',
                  px: 0.5,
                  py: 0,
                  mr: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  gap: 0.25,
                  whiteSpace: 'nowrap',
                  '&:hover': { background: 'transparent' },
                }}
                disableRipple
              >
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{selectedCountry.flag}</span>
                <KeyboardArrowDownIcon sx={{ fontSize: '0.9rem' }} />
                <span>+{selectedCountry.dialCode}</span>
              </Button>
              <Divider orientation="vertical" flexItem sx={{ mr: 1, my: 0.5 }} />
            </InputAdornment>
          ),
        }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
          setSearch('');
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 280, maxHeight: 380 } }}
        TransitionProps={{ onEntered: () => searchRef.current?.focus() }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <InputBase
            inputRef={searchRef}
            fullWidth
            placeholder="Buscar país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ px: 1, py: 0.25, fontSize: '0.875rem' }}
          />
        </Box>
        <List dense sx={{ overflow: 'auto', maxHeight: 320 }}>
          {filteredCountries.map((country) => (
            <ListItem key={country.code} disablePadding>
              <ListItemButton
                selected={selectedCountry.code === country.code}
                onClick={() => handleCountrySelect(country)}
                sx={{ py: 0.5 }}
              >
                <Typography sx={{ mr: 1.5, fontSize: '1.15rem', lineHeight: 1 }}>
                  {country.flag}
                </Typography>
                <ListItemText
                  primary={country.name}
                  secondary={`+${country.dialCode}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {filteredCountries.length === 0 && (
            <ListItem>
              <ListItemText
                primary="Sin resultados"
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          )}
        </List>
      </Popover>
    </Box>
  );
};
