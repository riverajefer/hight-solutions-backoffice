import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  Typography,
  Stack,
  Skeleton,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import type { StepIconProps } from '@mui/material/StepIcon';
import type { DtfStatus, DtfStatusHistoryEntry } from '../../../types/dtf.types';
import { formatDateTime } from '../../../utils/formatters';

const ORDERED_STEPS: DtfStatus[] = ['BORRADOR', 'ENVIADA', 'EN_IMPRESION', 'COMPLETADA'];

const STEP_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  EN_IMPRESION: 'En Impresión',
  COMPLETADA: 'Completada',
  CONVERTIDA_EN_OP: 'Convertida en OP',
};

const SUCCESS_GREEN = '#2ED573';
const SUCCESS_GREEN_GLOW = 'rgba(46, 213, 115, 0.4)';

const NeonConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 15,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, ${SUCCESS_GREEN}, ${theme.palette.primary.main})`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: SUCCESS_GREEN,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    borderRadius: 2,
    backgroundColor: theme.palette.divider,
  },
}));

function DtfStepIcon(props: StepIconProps) {
  const { active, completed } = props;

  if (completed) {
    return (
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: SUCCESS_GREEN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 10px ${SUCCESS_GREEN_GLOW}`,
        }}
      >
        <CheckIcon sx={{ color: '#0a1628', fontSize: 16, fontWeight: 700 }} />
      </Box>
    );
  }

  if (active) {
    return (
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '2.5px solid',
          borderColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          boxShadow: '0 0 10px rgba(33, 150, 243, 0.35)',
        }}
      >
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            bgcolor: 'primary.main',
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        bgcolor: 'action.disabledBackground',
        opacity: 0.5,
      }}
    />
  );
}

interface DtfStatusStepperProps {
  currentStatus: DtfStatus;
  history: DtfStatusHistoryEntry[];
  isLoading?: boolean;
}

export function DtfStatusStepper({ currentStatus, history, isLoading }: DtfStatusStepperProps) {
  if (isLoading) {
    return (
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ py: 0.5 }}>
        {[0, 1, 2, 3].map((i) => (
          <Stack key={i} alignItems="center" spacing={0.5}>
            <Skeleton variant="circular" width={30} height={30} />
            <Skeleton variant="text" width={80} />
          </Stack>
        ))}
      </Stack>
    );
  }

  const isConverted = currentStatus === 'CONVERTIDA_EN_OP';
  const activeStepIndex = isConverted
    ? ORDERED_STEPS.length
    : ORDERED_STEPS.indexOf(currentStatus);

  const getHistoryEntry = (step: DtfStatus): DtfStatusHistoryEntry | undefined =>
    history.find((h) => h.toStatus === step);

  return (
    <Box sx={{ py: 0.5 }}>
      <Stepper
        activeStep={activeStepIndex}
        alternativeLabel
        connector={<NeonConnector />}
      >
        {ORDERED_STEPS.map((step, index) => {
          const entry = getHistoryEntry(step);
          const isCompleted = index < activeStepIndex;
          const isActive = index === activeStepIndex;

          return (
            <Step key={step} completed={isCompleted}>
              <StepLabel
                StepIconComponent={DtfStepIcon}
                optional={
                  <Stack alignItems="center" spacing={0.25} sx={{ mt: 0.5 }}>
                    {entry ? (
                      <>
                        <Typography
                          variant="caption"
                          color={isActive ? 'primary.main' : 'text.secondary'}
                          sx={{ fontWeight: isActive ? 600 : 400 }}
                        >
                          {formatDateTime(entry.changedAt)}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {entry.changedBy.firstName} {entry.changedBy.lastName}
                        </Typography>
                      </>
                    ) : isActive ? (
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                        Actual
                      </Typography>
                    ) : isCompleted ? null : (
                      <Typography variant="caption" color="text.disabled">
                        Pendiente
                      </Typography>
                    )}
                  </Stack>
                }
                sx={{
                  '& .MuiStepLabel-label': {
                    fontWeight: isActive ? 700 : 500,
                    color: isActive
                      ? 'primary.main'
                      : isCompleted
                        ? 'text.primary'
                        : 'text.disabled',
                    mt: 1,
                  },
                }}
              >
                {STEP_LABELS[step]}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {isConverted && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Chip
            icon={<TaskAltIcon />}
            label={`${STEP_LABELS['CONVERTIDA_EN_OP']} — ${
              getHistoryEntry('CONVERTIDA_EN_OP')
                ? formatDateTime(getHistoryEntry('CONVERTIDA_EN_OP')!.changedAt)
                : ''
            }`}
            color="success"
            variant="outlined"
            size="small"
          />
        </Stack>
      )}
    </Box>
  );
}
