import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { MANUALS, getManualUrl, type Manual } from '../manuals.catalog';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Biblioteca de manuales en PDF.
 *
 * En escritorio: lista a la izquierda y visor a la derecha (el visor nativo del
 * navegador, que ya trae zoom, búsqueda e impresión). En celular los visores
 * embebidos muestran mal los PDF de varias páginas, así que cada manual se abre
 * en una pestaña nueva.
 */
const ManualsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasAnyPermission } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const manuals = React.useMemo(
    () => MANUALS.filter((m) => !m.permissions || hasAnyPermission(m.permissions)),
    [hasAnyPermission],
  );

  const categories = React.useMemo(
    () => Array.from(new Set(manuals.map((m) => m.category))),
    [manuals],
  );

  const selected =
    manuals.find((m) => m.slug === searchParams.get('doc')) ?? manuals[0] ?? null;

  const handleSelect = (manual: Manual) => {
    if (isMobile) {
      window.open(getManualUrl(manual), '_blank', 'noopener');
      return;
    }
    setSearchParams({ doc: manual.slug }, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="Manuales"
        subtitle="Guías de uso del CRM. Puedes leerlas aquí, abrirlas en otra pestaña o descargarlas."
        icon={<MenuBookIcon />}
      />

      {manuals.length === 0 ? (
        <Typography color="text.secondary">No hay manuales disponibles para tu usuario.</Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Stack spacing={2}>
            {categories.map((category) => (
              <Box key={category}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5, px: 0.5 }}
                >
                  {category}
                </Typography>
                <Stack spacing={1}>
                  {manuals
                    .filter((m) => m.category === category)
                    .map((manual) => {
                      const isSelected = !isMobile && selected?.slug === manual.slug;
                      return (
                        <Card
                          key={manual.slug}
                          variant="outlined"
                          sx={{
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            borderWidth: isSelected ? 2 : 1,
                          }}
                        >
                          <CardActionArea
                            onClick={() => handleSelect(manual)}
                            aria-current={isSelected ? 'page' : undefined}
                            sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
                          >
                            <PictureAsPdfOutlinedIcon color="error" sx={{ mt: 0.25 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
                                {manual.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5, fontSize: '0.8rem' }}
                              >
                                {manual.description}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}
                              >
                                <Chip label={manual.audience} size="small" variant="outlined" />
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(manual.updatedAt)}
                                </Typography>
                              </Stack>
                            </Box>
                            {isMobile && <OpenInNewIcon fontSize="small" color="action" />}
                          </CardActionArea>
                        </Card>
                      );
                    })}
                </Stack>
              </Box>
            ))}
          </Stack>

          {!isMobile && selected && (
            <Paper
              variant="outlined"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'sticky',
                top: 80,
                height: 'calc(100vh - 120px)',
                minHeight: 480,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}
              >
                <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }} noWrap>
                  {selected.title}
                </Typography>
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  href={getManualUrl(selected)}
                  target="_blank"
                  rel="noopener"
                >
                  Abrir en pestaña
                </Button>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  href={getManualUrl(selected)}
                  download={selected.file}
                >
                  Descargar
                </Button>
              </Stack>
              <Box
                component="iframe"
                key={selected.slug}
                src={getManualUrl(selected)}
                title={selected.title}
                sx={{ flex: 1, width: '100%', border: 0, bgcolor: 'grey.100' }}
              />
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ManualsPage;
