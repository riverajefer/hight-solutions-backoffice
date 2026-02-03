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
import { NotificationBell } from './NotificationBell';
import { gradients, neonColors, neonAccents, darkSurfaces } from '../../theme';

interface TopbarProps {
  onMenuClick?: () => void;
}

/**
 * Topbar con estilo Neón Elegante
 */
export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
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
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: isDark
          ? `linear-gradient(90deg, ${darkSurfaces.midnightBlue} 0%, ${darkSurfaces.cosmicPurple} 100%)`
          : `linear-gradient(90deg, #1e293b 0%, #363A72 100%)`,
        borderBottom: isDark
          ? `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`
          : `1px solid ${alpha(neonColors.primary.main, 0.2)}`,
        boxShadow: isDark
          ? `0 4px 20px ${alpha(neonColors.primary.main, 0.15)}, 0 0 30px ${alpha(neonAccents.vividPurple, 0.1)}`
          : '0 4px 20px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Toolbar>
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{
              mr: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: alpha(neonColors.primary.main, 0.2),
                transform: 'scale(1.05)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            background: isDark
              ? gradients.neonPrimary
              : 'linear-gradient(90deg, #FFFFFF 0%, #C1E3EE 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: isDark ? 'none' : 'none',
            filter: isDark
              ? `drop-shadow(0 0 8px ${alpha(neonColors.primary.main, 0.5)})`
              : 'none',
          }}
        >
          Hight Solutions Backoffice
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          <ThemeToggler />

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Menu Button */}
          <Box
            onClick={handleMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              py: 0.75,
              px: 1.5,
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              background: isDark
                ? alpha(neonColors.primary.main, 0.1)
                : alpha(theme.palette.common.white, 0.1),
              border: `1px solid ${isDark
                ? alpha(neonAccents.vividPurple, 0.2)
                : alpha(theme.palette.common.white, 0.2)}`,
              '&:hover': {
                background: isDark
                  ? alpha(neonColors.primary.main, 0.2)
                  : alpha(theme.palette.common.white, 0.2),
                borderColor: isDark
                  ? alpha(neonColors.primary.main, 0.5)
                  : alpha(theme.palette.common.white, 0.4),
                transform: 'translateY(-2px)',
                boxShadow: isDark
                  ? `0 4px 15px ${alpha(neonColors.primary.main, 0.3)}`
                  : '0 4px 15px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            <Avatar
              src={user?.profilePhoto || undefined}
              sx={{
                width: 36,
                height: 36,
                background: isDark
                  ? gradients.ocean
                  : gradients.neonPrimary,
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxShadow: isDark
                  ? `0 0 15px ${alpha(neonColors.primary.main, 0.5)}`
                  : '0 2px 8px rgba(0, 0, 0, 0.2)',
                border: `2px solid ${isDark
                  ? alpha(neonColors.primary.main, 0.5)
                  : alpha(theme.palette.common.white, 0.5)}`,
              }}
            >
              {userInitials}
            </Avatar>
            {!isMobile && (
              <Box sx={{ textAlign: 'left' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: 'white',
                  }}
                >
                  {userName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: isDark
                      ? neonColors.primary.light
                      : alpha(theme.palette.common.white, 0.8),
                    lineHeight: 1,
                  }}
                >
                  {user?.role?.name || 'Usuario'}
                </Typography>
              </Box>
            )}
            <KeyboardArrowDownIcon
              sx={{
                fontSize: 20,
                color: isDark
                  ? neonColors.primary.light
                  : alpha(theme.palette.common.white, 0.8),
                transition: 'transform 0.3s ease',
                transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'rotate(0)',
              }}
            />
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
              mt: 1.5,
              minWidth: 220,
              borderRadius: '16px',
              background: isDark
                ? `linear-gradient(135deg, ${alpha(darkSurfaces.midnightBlue, 0.95)} 0%, ${alpha(darkSurfaces.cosmicPurple, 0.9)} 100%)`
                : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              backdropFilter: 'blur(16px)',
              border: isDark
                ? `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`
                : `1px solid ${alpha(neonColors.primary.main, 0.15)}`,
              boxShadow: isDark
                ? `0 10px 40px ${alpha(neonColors.primary.main, 0.2)}, 0 0 20px ${alpha(neonAccents.vividPurple, 0.15)}`
                : '0 10px 40px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
            },
          }}
        >
          {/* User Info Header */}
          <Box
            sx={{
              px: 2.5,
              py: 2,
              background: isDark
                ? `linear-gradient(135deg, ${alpha(neonColors.primary.main, 0.1)} 0%, ${alpha(neonAccents.vividPurple, 0.08)} 100%)`
                : `linear-gradient(135deg, ${alpha(neonColors.primary.main, 0.08)} 0%, ${alpha(neonAccents.vividPurple, 0.05)} 100%)`,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{
                color: isDark ? 'white' : 'text.primary',
              }}
            >
              {userName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? neonColors.primary.light : 'text.secondary',
              }}
            >
              {user?.email}
            </Typography>
          </Box>

          <Divider
            sx={{
              borderColor: isDark
                ? alpha(neonAccents.vividPurple, 0.2)
                : alpha(neonColors.primary.main, 0.1),
            }}
          />

          <MenuItem
            onClick={handleProfile}
            sx={{
              py: 1.5,
              mx: 1,
              my: 0.5,
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: isDark
                  ? alpha(neonColors.primary.main, 0.15)
                  : alpha(neonColors.primary.main, 0.08),
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <PersonIcon
                fontSize="small"
                sx={{
                  color: isDark ? neonColors.primary.main : neonColors.primary.dark,
                }}
              />
            </ListItemIcon>
            <Typography
              sx={{
                color: isDark ? 'white' : 'text.primary',
                fontWeight: 500,
              }}
            >
              Mi Perfil
            </Typography>
          </MenuItem>

          <Divider
            sx={{
              borderColor: isDark
                ? alpha(neonAccents.vividPurple, 0.2)
                : alpha(neonColors.primary.main, 0.1),
            }}
          />

          <MenuItem
            onClick={handleLogout}
            sx={{
              py: 1.5,
              mx: 1,
              my: 0.5,
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: isDark
                  ? alpha(neonAccents.neonMagenta, 0.15)
                  : alpha(theme.palette.error.main, 0.08),
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <LogoutIcon
                fontSize="small"
                sx={{
                  color: isDark ? neonAccents.neonMagenta : theme.palette.error.main,
                }}
              />
            </ListItemIcon>
            <Typography
              sx={{
                color: isDark ? neonAccents.neonMagenta : theme.palette.error.main,
                fontWeight: 500,
              }}
            >
              Cerrar Sesión
            </Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
