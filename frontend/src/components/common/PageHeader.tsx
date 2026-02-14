import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
}

/**
 * Header de página con título y breadcrumbs
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  action,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 2 }}>
          {breadcrumbs.map((crumb, index) => (
            <div key={index}>
              {crumb.path ? (
                <Link component={RouterLink} to={crumb.path} underline="hover">
                  {crumb.label}
                </Link>
              ) : (
                <Typography color="textPrimary">{crumb.label}</Typography>
              )}
            </div>
          ))}
        </Breadcrumbs>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 2, sm: 0 }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              color="textSecondary"
              variant="body2"
              sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && (
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {action}
          </Box>
        )}
      </Box>
    </Box>
  );
};
