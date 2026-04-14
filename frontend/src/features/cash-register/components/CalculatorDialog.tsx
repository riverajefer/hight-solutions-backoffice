import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BackspaceIcon from '@mui/icons-material/Backspace';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

/** Format a raw string of digits into "1.234.567" (thousands-separated, no currency symbol) */
const formatThousands = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('es-CO');
};

/** Extract the numeric value from a formatted string */
const parseFormatted = (formatted: string): number => {
  const digits = formatted.replace(/\D/g, '');
  return Number(digits) || 0;
};

type CalcTab = 'calculator' | 'change';

interface CalculatorDialogProps {
  open: boolean;
  onClose: () => void;
}

const BUTTON_SX = {
  minWidth: 0,
  fontSize: '1.2rem',
  fontWeight: 600,
  py: 1.5,
};

const CalculatorDialog: React.FC<CalculatorDialogProps> = ({ open, onClose }) => {
  const [tab, setTab] = useState<CalcTab>('change');

  // ── Change calculator state ─────────────────────────
  const [totalAmount, setTotalAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  const changeResult = (() => {
    const total = parseFormatted(totalAmount);
    const received = parseFormatted(receivedAmount);
    return received - total;
  })();

  const resetChange = () => {
    setTotalAmount('');
    setReceivedAmount('');
  };

  // ── General calculator state ────────────────────────
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const resetCalc = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const inputDigit = useCallback(
    (digit: string) => {
      if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === '0' ? digit : display + digit);
      }
    },
    [display, waitingForOperand],
  );

  const inputDot = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const handleBackspace = useCallback(() => {
    if (waitingForOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  }, [display, waitingForOperand]);

  const performOperation = useCallback(
    (nextOp: string) => {
      const current = parseFloat(display);

      if (prevValue == null) {
        setPrevValue(current);
      } else if (operator) {
        let result = prevValue;
        switch (operator) {
          case '+':
            result = prevValue + current;
            break;
          case '-':
            result = prevValue - current;
            break;
          case '×':
            result = prevValue * current;
            break;
          case '÷':
            result = current !== 0 ? prevValue / current : 0;
            break;
        }
        setPrevValue(result);
        setDisplay(String(result));
      }

      setOperator(nextOp === '=' ? null : nextOp);
      setWaitingForOperand(true);
    },
    [display, prevValue, operator],
  );

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Calculadora
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pb: 1 }}>
        {/* Tab toggle */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            size="small"
            variant={tab === 'change' ? 'contained' : 'outlined'}
            onClick={() => setTab('change')}
            sx={{ flex: 1 }}
          >
            Calcular Cambio
          </Button>
          <Button
            size="small"
            variant={tab === 'calculator' ? 'contained' : 'outlined'}
            onClick={() => setTab('calculator')}
            sx={{ flex: 1 }}
          >
            Calculadora
          </Button>
        </Box>

        {tab === 'change' ? (
          /* ── Change Calculator ─────────────────────────── */
          <Box>
            <TextField
              label="Valor a cobrar"
              fullWidth
              size="small"
              value={totalAmount}
              onChange={(e) => setTotalAmount(formatThousands(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ inputMode: 'numeric' }}
              autoFocus
            />
            <TextField
              label="Monto recibido"
              fullWidth
              size="small"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(formatThousands(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ inputMode: 'numeric' }}
            />

            <Divider sx={{ mb: 2 }} />

            <Box
              sx={{
                textAlign: 'center',
                py: 2,
                px: 2,
                borderRadius: 2,
                bgcolor: changeResult >= 0 ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.08)',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {changeResult >= 0 ? 'Cambio a devolver' : 'Falta por cobrar'}
              </Typography>
              <Typography
                variant="h4"
                fontWeight={800}
                color={changeResult >= 0 ? 'success.main' : 'error.main'}
                sx={{ letterSpacing: '-0.5px' }}
              >
                {formatCurrency(Math.abs(changeResult))}
              </Typography>
            </Box>

            {/* Quick amounts */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
              Montos rápidos
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[10000, 20000, 50000, 100000, 200000].map((amt) => (
                <Button
                  key={amt}
                  size="small"
                  variant="outlined"
                  onClick={() => setReceivedAmount(formatThousands(String(amt)))}
                  sx={{ fontSize: '0.75rem', minWidth: 0, px: 1.5 }}
                >
                  {formatCurrency(amt)}
                </Button>
              ))}
            </Box>
          </Box>
        ) : (
          /* ── General Calculator ────────────────────────── */
          <Box>
            <Box
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                px: 2,
                py: 1.5,
                mb: 2,
                textAlign: 'right',
                minHeight: 60,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              {operator && prevValue != null && !waitingForOperand && (
                <Typography variant="caption" color="text.secondary">
                  {prevValue} {operator}
                </Typography>
              )}
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  background: 'linear-gradient(90deg, #000 0%, #000 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  wordBreak: 'break-all',
                  fontSize: display.length > 12 ? '1.2rem' : display.length > 8 ? '1.6rem' : '2.125rem',
                }}
              >
                {display}
              </Typography>
            </Box>

            <Grid container spacing={0.75}>
              {/* Row 1 */}
              <Grid item xs={3}>
                <Button fullWidth variant="outlined" color="secondary" onClick={resetCalc} sx={BUTTON_SX}>
                  C
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button fullWidth variant="outlined" color="secondary" onClick={handleBackspace} sx={BUTTON_SX}>
                  <BackspaceIcon fontSize="small" />
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button fullWidth variant="outlined" color="secondary" onClick={() => {
                  const current = parseFloat(display);
                  if (!isNaN(current)) {
                    const pct = prevValue != null && operator ? (prevValue * current) / 100 : current / 100;
                    setDisplay(String(pct));
                  }
                }} sx={BUTTON_SX}>
                  %
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button fullWidth variant="contained" color="warning" onClick={() => performOperation('÷')} sx={BUTTON_SX}>
                  ÷
                </Button>
              </Grid>

              {/* Row 2 */}
              {['7', '8', '9'].map((d) => (
                <Grid item xs={3} key={d}>
                  <Button fullWidth variant="outlined" onClick={() => inputDigit(d)} sx={BUTTON_SX}>
                    {d}
                  </Button>
                </Grid>
              ))}
              <Grid item xs={3}>
                <Button fullWidth variant="contained" color="warning" onClick={() => performOperation('×')} sx={BUTTON_SX}>
                  ×
                </Button>
              </Grid>

              {/* Row 3 */}
              {['4', '5', '6'].map((d) => (
                <Grid item xs={3} key={d}>
                  <Button fullWidth variant="outlined" onClick={() => inputDigit(d)} sx={BUTTON_SX}>
                    {d}
                  </Button>
                </Grid>
              ))}
              <Grid item xs={3}>
                <Button fullWidth variant="contained" color="warning" onClick={() => performOperation('-')} sx={BUTTON_SX}>
                  −
                </Button>
              </Grid>

              {/* Row 4 */}
              {['1', '2', '3'].map((d) => (
                <Grid item xs={3} key={d}>
                  <Button fullWidth variant="outlined" onClick={() => inputDigit(d)} sx={BUTTON_SX}>
                    {d}
                  </Button>
                </Grid>
              ))}
              <Grid item xs={3}>
                <Button fullWidth variant="contained" color="warning" onClick={() => performOperation('+')} sx={BUTTON_SX}>
                  +
                </Button>
              </Grid>

              {/* Row 5 */}
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" onClick={() => inputDigit('0')} sx={BUTTON_SX}>
                  0
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button fullWidth variant="outlined" onClick={inputDot} sx={BUTTON_SX}>
                  .
                </Button>
              </Grid>
              <Grid item xs={3}>
                <Button fullWidth variant="contained" color="primary" onClick={() => performOperation('=')} sx={BUTTON_SX}>
                  =
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        {tab === 'change' && (
          <Button size="small" onClick={resetChange}>
            Limpiar
          </Button>
        )}
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CalculatorDialog;
