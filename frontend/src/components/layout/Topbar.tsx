import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
  useTheme,
  useMediaQuery,
  Divider,
  ListItemIcon,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../utils/constants';
import { formatFullName } from '../../utils/helpers';
import { ThemeToggler } from '../common/ThemeToggler';

interface TopbarProps {
  onMenuClick?: () => void;
}

/**
 * Topbar con información del usuario
 */
export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate(ROUTES.LOGIN);
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate(ROUTES.PROFILE);
  };

  const userName = user ? formatFullName(user.firstName, user.lastName) : 'Usuario';
  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() ||
      user.email.charAt(0).toUpperCase()
    : 'U';

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Hight Solutions Backoffice
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          <ThemeToggler />

          {/* User Menu Button */}
          <Box
            onClick={handleMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              py: 0.5,
              px: 1,
              borderRadius: 2,
              transition: 'background-color 0.2s',
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.1),
              },
            }}
          >
            <Avatar
              src={user?.profilePhoto || undefined}
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {userInitials}
            </Avatar>
            {!isMobile && (
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {userName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
                  {user?.role?.name || 'Usuario'}
                </Typography>
              </Box>
            )}
            <KeyboardArrowDownIcon sx={{ fontSize: 20, opacity: 0.7 }} />
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
              boxShadow: theme.shadows[8],
            },
          }}
        >
          {/* User Info Header */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>

          <Divider />

          <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Mi Perfil
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            Cerrar Sesión
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
