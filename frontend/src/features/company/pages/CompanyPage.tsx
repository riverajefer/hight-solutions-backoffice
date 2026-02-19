import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import BusinessIcon from '@mui/icons-material/Business';
import ImageIcon from '@mui/icons-material/Image';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { useCompany } from '../hooks/useCompany';
import { storageApi } from '../../../api/storage.api';
import type { UpsertCompanyDto } from '../../../types/company.types';

const currentYear = new Date().getFullYear();

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobilePhone: z.string().optional().nullable(),
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  legalRepresentative: z.string().optional().nullable(),
  foundedYear: z
    .union([z.number().int().min(1900).max(currentYear), z.nan(), z.undefined(), z.null()])
    .optional()
    .nullable(),
  taxRegime: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankAccountType: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface LogoState {
  fileId: string | null;
  previewUrl: string | null;
  uploading: boolean;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="subtitle1"
      fontWeight={600}
      sx={{
        mb: 2,
        color: theme.palette.primary.main,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {children}
    </Typography>
  );
};

const LogoUploader: React.FC<{
  label: string;
  logo: LogoState;
  onUpload: (file: File) => void;
  onDelete: () => void;
}> = ({ label, logo, onUpload, onDelete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          width: 200,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderStyle: 'dashed',
          borderColor: isDark
            ? alpha(theme.palette.primary.main, 0.4)
            : alpha(theme.palette.primary.main, 0.3),
          background: isDark
            ? alpha(theme.palette.primary.main, 0.04)
            : alpha(theme.palette.primary.main, 0.02),
          cursor: logo.uploading ? 'default' : 'pointer',
        }}
        onClick={() => !logo.uploading && inputRef.current?.click()}
      >
        {logo.uploading ? (
          <CircularProgress size={32} />
        ) : logo.previewUrl ? (
          <>
            <Box
              component="img"
              src={logo.previewUrl}
              alt={label}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                p: 1,
              }}
            />
            <Tooltip title="Eliminar logo">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: alpha(theme.palette.error.main, 0.9),
                  color: 'white',
                  '&:hover': { bgcolor: theme.palette.error.dark },
                  width: 24,
                  height: 24,
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <ImageIcon sx={{ fontSize: 40, mb: 0.5 }} />
            <Typography variant="caption" display="block">
              Clic para subir
            </Typography>
          </Box>
        )}
      </Paper>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </Box>
  );
};

export const CompanyPage: React.FC = () => {
  const { companyQuery, upsertMutation } = useCompany();
  const { enqueueSnackbar } = useSnackbar();

  const [logoLight, setLogoLight] = useState<LogoState>({
    fileId: null,
    previewUrl: null,
    uploading: false,
  });
  const [logoDark, setLogoDark] = useState<LogoState>({
    fileId: null,
    previewUrl: null,
    uploading: false,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      mobilePhone: '',
      email: '',
      website: '',
      address: '',
      nit: '',
      legalRepresentative: '',
      foundedYear: undefined,
      taxRegime: '',
      bankName: '',
      bankAccountNumber: '',
      bankAccountType: '',
    },
  });

  const company = companyQuery.data;

  useEffect(() => {
    if (company) {
      reset({
        name: company.name || '',
        description: company.description || '',
        phone: company.phone || '',
        mobilePhone: company.mobilePhone || '',
        email: company.email || '',
        website: company.website || '',
        address: company.address || '',
        nit: company.nit || '',
        legalRepresentative: company.legalRepresentative || '',
        foundedYear: company.foundedYear ?? undefined,
        taxRegime: company.taxRegime || '',
        bankName: company.bankName || '',
        bankAccountNumber: company.bankAccountNumber || '',
        bankAccountType: company.bankAccountType || '',
      });

      setLogoLight({
        fileId: company.logoLightId || null,
        previewUrl: company.logoLightUrl || null,
        uploading: false,
      });
      setLogoDark({
        fileId: company.logoDarkId || null,
        previewUrl: company.logoDarkUrl || null,
        uploading: false,
      });
    }
  }, [company, reset]);

  const handleLogoUpload = async (
    file: File,
    type: 'light' | 'dark',
  ) => {
    const setter = type === 'light' ? setLogoLight : setLogoDark;

    setter((prev) => ({ ...prev, uploading: true }));
    try {
      const uploaded = await storageApi.uploadFile(file, { entityType: 'company' });
      const urlResult = await storageApi.getFileUrl(uploaded.id);
      setter({ fileId: uploaded.id, previewUrl: urlResult.url, uploading: false });
    } catch {
      enqueueSnackbar('Error al subir el logo', { variant: 'error' });
      setter((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleLogoDelete = async (type: 'light' | 'dark') => {
    const state = type === 'light' ? logoLight : logoDark;
    const setter = type === 'light' ? setLogoLight : setLogoDark;

    if (state.fileId) {
      try {
        await storageApi.deleteFile(state.fileId);
      } catch {
        // Si ya fue eliminado, continuar
      }
    }
    setter({ fileId: null, previewUrl: null, uploading: false });
  };

  const onSubmit = async (values: FormValues) => {
    const dto: UpsertCompanyDto = {
      name: values.name,
      description: values.description || null,
      phone: values.phone || null,
      mobilePhone: values.mobilePhone || null,
      email: values.email || null,
      website: values.website || null,
      address: values.address || null,
      nit: values.nit || null,
      legalRepresentative: values.legalRepresentative || null,
      foundedYear: values.foundedYear ?? null,
      taxRegime: values.taxRegime || null,
      bankName: values.bankName || null,
      bankAccountNumber: values.bankAccountNumber || null,
      bankAccountType: values.bankAccountType || null,
      logoLightId: logoLight.fileId,
      logoDarkId: logoDark.fileId,
    };
    upsertMutation.mutate(dto);
  };

  const isSaving = upsertMutation.isPending;
  const isLoading = companyQuery.isLoading;

  return (
    <Box>
      <PageHeader
        title="Información de la Compañía"
        subtitle="Gestiona los datos institucionales de tu empresa"
        icon={<BusinessIcon />}
        action={
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || isLoading || logoLight.uploading || logoDark.uploading}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        }
      />

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={3}>
            {/* Información General */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <SectionTitle>Información General</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Nombre de la compañía"
                          fullWidth
                          required
                          error={!!errors.name}
                          helperText={errors.name?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="foundedYear"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Año de fundación"
                          fullWidth
                          type="number"
                          inputProps={{ min: 1900, max: currentYear }}
                          error={!!errors.foundedYear}
                          helperText={errors.foundedYear?.message}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : Number(val));
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="taxRegime"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Régimen tributario"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.taxRegime}
                          helperText={errors.taxRegime?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Descripción"
                          fullWidth
                          multiline
                          rows={3}
                          value={field.value ?? ''}
                          error={!!errors.description}
                          helperText={errors.description?.message}
                          placeholder="¿A qué se dedica la empresa?"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Logos */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <SectionTitle>Logos</SectionTitle>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sube las versiones del logo para modo claro y modo oscuro. Se recomienda formato PNG con fondo transparente.
                </Typography>
                <Box display="flex" gap={4} flexWrap="wrap">
                  <LogoUploader
                    label="Logo modo claro"
                    logo={logoLight}
                    onUpload={(file) => handleLogoUpload(file, 'light')}
                    onDelete={() => handleLogoDelete('light')}
                  />
                  <LogoUploader
                    label="Logo modo oscuro"
                    logo={logoDark}
                    onUpload={(file) => handleLogoUpload(file, 'dark')}
                    onDelete={() => handleLogoDelete('dark')}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Datos de Contacto */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <SectionTitle>Datos de Contacto</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Teléfono fijo"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.phone}
                          helperText={errors.phone?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="mobilePhone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Teléfono celular"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.mobilePhone}
                          helperText={errors.mobilePhone?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email"
                          fullWidth
                          type="email"
                          value={field.value ?? ''}
                          error={!!errors.email}
                          helperText={errors.email?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="website"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Página web"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.website}
                          helperText={errors.website?.message}
                          placeholder="https://www.empresa.com"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Dirección y Datos Legales */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <SectionTitle>Dirección y Datos Legales</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="address"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Dirección"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.address}
                          helperText={errors.address?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="nit"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="NIT"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.nit}
                          helperText={errors.nit?.message}
                          placeholder="900000000-0"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="legalRepresentative"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Representante legal"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.legalRepresentative}
                          helperText={errors.legalRepresentative?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Datos Bancarios */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <SectionTitle>Datos Bancarios</SectionTitle>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="bankName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Banco"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.bankName}
                          helperText={errors.bankName?.message}
                          placeholder="Ej. Bancolombia"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="bankAccountNumber"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Número de cuenta"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.bankAccountNumber}
                          helperText={errors.bankAccountNumber?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="bankAccountType"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Tipo de cuenta"
                          fullWidth
                          value={field.value ?? ''}
                          error={!!errors.bankAccountType}
                          helperText={errors.bankAccountType?.message}
                          placeholder="Ej. Corriente / Ahorros"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={isSaving || isLoading || logoLight.uploading || logoDark.uploading}
            >
              {isSaving ? 'Guardando...' : 'Guardar información'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CompanyPage;
