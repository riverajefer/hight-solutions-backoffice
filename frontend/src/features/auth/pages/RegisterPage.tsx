import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

/**
 * Página de registro (placeholder)
 */
const RegisterPage: React.FC = () => {
  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
          Registro
        </Typography>
        <Typography color="textSecondary">
          La funcionalidad de registro será habilitada por el administrador.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default RegisterPage;
