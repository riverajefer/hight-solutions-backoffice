import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Dialog,
  Box,
  InputBase,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CampaignIcon from '@mui/icons-material/Campaign';
import FactoryIcon from '@mui/icons-material/Factory';
import DescriptionIcon from '@mui/icons-material/Description';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import HistoryIcon from '@mui/icons-material/History';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BadgeIcon from '@mui/icons-material/Badge';
import DateRangeIcon from '@mui/icons-material/DateRange';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import ScienceIcon from '@mui/icons-material/Science';
import StraightenIcon from '@mui/icons-material/Straighten';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import AddCardIcon from '@mui/icons-material/AddCard';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import KeyIcon from '@mui/icons-material/Key';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WorkIcon from '@mui/icons-material/Work';
import SchemaIcon from '@mui/icons-material/Schema';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SEARCH_REGISTRY, CATEGORY_LABELS, scoreItem, type SearchItem } from './searchRegistry';
import { neonColors, neonAccents, darkSurfaces } from '../../theme';

const ICON_MAP: Record<string, React.ReactElement> = {
  Dashboard: <DashboardIcon fontSize="small" />,
  People: <PeopleIcon fontSize="small" />,
  LocalShipping: <LocalShippingIcon fontSize="small" />,
  ShoppingCart: <ShoppingCartIcon fontSize="small" />,
  RequestQuote: <RequestQuoteIcon fontSize="small" />,
  Assignment: <AssignmentIcon fontSize="small" />,
  Receipt: <ReceiptIcon fontSize="small" />,
  Campaign: <CampaignIcon fontSize="small" />,
  Factory: <FactoryIcon fontSize="small" />,
  Description: <DescriptionIcon fontSize="small" />,
  PaymentOutlined: <PaymentOutlinedIcon fontSize="small" />,
  TrendingUp: <TrendingUpIcon fontSize="small" />,
  ChangeCircle: <ChangeCircleIcon fontSize="small" />,
  PointOfSale: <PointOfSaleIcon fontSize="small" />,
  History: <HistoryIcon fontSize="small" />,
  AccountBalance: <AccountBalanceIcon fontSize="small" />,
  Badge: <BadgeIcon fontSize="small" />,
  DateRange: <DateRangeIcon fontSize="small" />,
  Inventory: <InventoryIcon fontSize="small" />,
  WarningAmber: <WarningAmberIcon fontSize="small" />,
  Inventory2: <Inventory2Icon fontSize="small" />,
  Category: <CategoryIcon fontSize="small" />,
  Science: <ScienceIcon fontSize="small" />,
  Straighten: <StraightenIcon fontSize="small" />,
  AccountTree: <AccountTreeIcon fontSize="small" />,
  AccessTime: <AccessTimeIcon fontSize="small" />,
  Notifications: <NotificationsIcon fontSize="small" />,
  Settings: <SettingsIcon fontSize="small" />,
  Business: <BusinessIcon fontSize="small" />,
  PersonAdd: <PersonAddIcon fontSize="small" />,
  AddShoppingCart: <AddShoppingCartIcon fontSize="small" />,
  NoteAdd: <NoteAddIcon fontSize="small" />,
  AssignmentAdd: <AssignmentIcon fontSize="small" />,
  AddBusiness: <AddBusinessIcon fontSize="small" />,
  AddBox: <AddBoxIcon fontSize="small" />,
  ReceiptLong: <ReceiptLongIcon fontSize="small" />,
  PrecisionManufacturing: <PrecisionManufacturingIcon fontSize="small" />,
  PostAdd: <PostAddIcon fontSize="small" />,
  CalendarMonth: <CalendarMonthIcon fontSize="small" />,
  MoveToInbox: <MoveToInboxIcon fontSize="small" />,
  AddCard: <AddCardIcon fontSize="small" />,
  LockOpen: <LockOpenIcon fontSize="small" />,
  ManageAccounts: <ManageAccountsIcon fontSize="small" />,
  SupervisorAccount: <SupervisorAccountIcon fontSize="small" />,
  AdminPanelSettings: <AdminPanelSettingsIcon fontSize="small" />,
  Key: <KeyIcon fontSize="small" />,
  ManageSearch: <ManageSearchIcon fontSize="small" />,
  VpnKey: <VpnKeyIcon fontSize="small" />,
  Work: <WorkIcon fontSize="small" />,
  Schema: <SchemaIcon fontSize="small" />,
};

const CATEGORY_ORDER: SearchItem['category'][] = ['modulo', 'accion', 'configuracion'];
const MAX_PER_CATEGORY = 5;
const DEFAULT_ITEMS_COUNT = 8;

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const words = query.trim().toLowerCase().split(/\s+/);
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <Box key={i} component="mark" sx={{ backgroundColor: 'transparent', color: neonColors.primary.main, fontWeight: 700 }}>
        {part}
      </Box>
    ) : part
  );
}

export const GlobalSearchModal: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore();
  const { hasPermission } = useAuthStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLLIElement>(null);

  const allowedItems = useMemo(() =>
    SEARCH_REGISTRY.filter(item => {
      if (item.permission) return hasPermission(item.permission);
      if (item.permissions) return item.permissions.some(p => hasPermission(p));
      return true;
    }),
    [hasPermission]
  );

  const results = useMemo(() => {
    if (!query.trim()) {
      return allowedItems.slice(0, DEFAULT_ITEMS_COUNT);
    }
    return allowedItems
      .map(item => ({ item, score: scoreItem(item, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [query, allowedItems]);

  const grouped = useMemo(() => {
    const map = new Map<SearchItem['category'], SearchItem[]>();
    for (const cat of CATEGORY_ORDER) {
      const items = results.filter(r => r.category === cat).slice(0, MAX_PER_CATEGORY);
      if (items.length) map.set(cat, items);
    }
    return map;
  }, [results]);

  const flatResults = useMemo(() => {
    const flat: SearchItem[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = grouped.get(cat);
      if (items) flat.push(...items);
    }
    return flat;
  }, [grouped]);

  const handleClose = useCallback(() => {
    setGlobalSearchOpen(false);
  }, [setGlobalSearchOpen]);

  // Cierra el modal automáticamente cuando cambia la ruta
  useEffect(() => {
    if (globalSearchOpen) {
      setGlobalSearchOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleSelect = useCallback((item: SearchItem) => {
    navigate(item.path);
  }, [navigate]);

  useEffect(() => {
    if (globalSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [globalSearchOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[selectedIndex]) handleSelect(flatResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      handleClose();
    }
  }, [flatResults, selectedIndex, handleSelect, handleClose]);

  let flatIndex = 0;

  return (
    <Dialog
      open={globalSearchOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      TransitionProps={{ onExited: () => setQuery('') }}
      BackdropProps={{
        sx: {
          backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          background: isDark
            ? `linear-gradient(135deg, ${alpha(darkSurfaces.midnightBlue, 0.97)} 0%, ${alpha(darkSurfaces.cosmicPurple, 0.95)} 100%)`
            : 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
          border: `1px solid ${isDark ? alpha(neonAccents.vividPurple, 0.4) : alpha(neonColors.primary.main, 0.2)}`,
          boxShadow: isDark
            ? `0 24px 60px ${alpha(neonColors.primary.main, 0.2)}, 0 0 40px ${alpha(neonAccents.vividPurple, 0.15)}`
            : '0 24px 60px rgba(0,0,0,0.2)',
          mt: -8,
        },
      }}
    >
      {/* Input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${isDark ? alpha(neonAccents.vividPurple, 0.2) : alpha(neonColors.primary.main, 0.12)}`,
          gap: 1.5,
        }}
        onKeyDown={handleKeyDown}
      >
        <SearchIcon sx={{ color: isDark ? neonColors.primary.main : neonColors.primary.dark, fontSize: 22 }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar módulos, acciones..."
          fullWidth
          sx={{
            fontSize: '1.05rem',
            color: isDark ? 'white' : 'text.primary',
            '& input::placeholder': {
              color: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.35),
            },
          }}
        />
        <Chip
          label="Esc"
          size="small"
          onClick={handleClose}
          sx={{
            fontSize: '0.7rem',
            height: 22,
            cursor: 'pointer',
            backgroundColor: isDark ? alpha(neonAccents.vividPurple, 0.2) : alpha(neonColors.primary.main, 0.1),
            color: isDark ? alpha('#fff', 0.6) : 'text.secondary',
            border: `1px solid ${isDark ? alpha(neonAccents.vividPurple, 0.3) : alpha(neonColors.primary.main, 0.2)}`,
            '&:hover': { backgroundColor: isDark ? alpha(neonAccents.vividPurple, 0.35) : alpha(neonColors.primary.main, 0.18) },
          }}
        />
      </Box>

      {/* Results — event delegation en el contenedor */}
      <Box
        sx={{ maxHeight: 400, overflowY: 'auto' }}
      >
        {flatResults.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: isDark ? alpha('#fff', 0.4) : 'text.disabled' }}>
              Sin resultados para "{query}"
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {CATEGORY_ORDER.map(cat => {
              const items = grouped.get(cat);
              if (!items) return null;
              return (
                <React.Fragment key={cat}>
                  <ListSubheader
                    sx={{
                      background: 'transparent',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: isDark ? neonColors.primary.main : neonColors.primary.dark,
                      lineHeight: '2.2rem',
                      px: 2,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </ListSubheader>
                  {items.map(item => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <ListItem
                        key={item.id}
                        ref={isSelected ? selectedRef : undefined}
                        onClick={() => handleSelect(item)}
                        sx={{
                          px: 2,
                          py: 0.75,
                          cursor: 'pointer',
                          borderLeft: `3px solid ${isSelected ? neonColors.primary.main : 'transparent'}`,
                          backgroundColor: isSelected
                            ? alpha(neonColors.primary.main, isDark ? 0.15 : 0.08)
                            : 'transparent',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            backgroundColor: alpha(neonColors.primary.main, isDark ? 0.12 : 0.06),
                            borderLeftColor: alpha(neonColors.primary.main, 0.5),
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 36,
                            color: isSelected
                              ? neonColors.primary.main
                              : isDark ? alpha('#fff', 0.55) : 'text.secondary',
                          }}
                        >
                          {ICON_MAP[item.icon] ?? <SearchIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={isSelected ? 600 : 500} sx={{ color: isDark ? 'white' : 'text.primary' }}>
                              {highlightText(item.label, query)}
                            </Typography>
                          }
                          secondary={
                            item.subtitle ? (
                              <Typography variant="caption" sx={{ color: isDark ? alpha('#fff', 0.4) : 'text.disabled' }}>
                                {item.subtitle}
                              </Typography>
                            ) : undefined
                          }
                        />
                      </ListItem>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: `1px solid ${isDark ? alpha(neonAccents.vividPurple, 0.15) : alpha(neonColors.primary.main, 0.1)}`,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
        }}
      >
        {[
          { keys: '↑↓', label: 'navegar' },
          { keys: '↵', label: 'abrir' },
          { keys: 'Esc', label: 'cerrar' },
        ].map(({ keys, label }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: '4px',
                backgroundColor: isDark ? alpha(neonAccents.vividPurple, 0.15) : alpha(neonColors.primary.main, 0.08),
                border: `1px solid ${isDark ? alpha(neonAccents.vividPurple, 0.25) : alpha(neonColors.primary.main, 0.15)}`,
                fontFamily: 'monospace',
                fontSize: '0.65rem',
                color: isDark ? alpha('#fff', 0.6) : 'text.secondary',
              }}
            >
              {keys}
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? alpha('#fff', 0.35) : 'text.disabled', fontSize: '0.65rem' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Dialog>
  );
};
