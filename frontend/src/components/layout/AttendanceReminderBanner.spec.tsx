import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { AttendanceReminderBanner } from './AttendanceReminderBanner';
import { attendanceApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { PERMISSIONS } from '../../utils/constants';
import type { AttendanceStatus } from '../../types';

vi.mock('../../api', () => ({
  attendanceApi: {
    getMyStatus: vi.fn(),
    clockIn: vi.fn(),
  },
}));

const renderBanner = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <SnackbarProvider>
        <AttendanceReminderBanner />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
};

const mockStatus = (status: AttendanceStatus) =>
  vi.mocked(attendanceApi.getMyStatus).mockResolvedValue(status);

/** 7:00 p. m. del 15 de septiembre en Colombia. */
const CIERRE_DE_JORNADA = '2026-09-16T00:00:00.000Z';

describe('AttendanceReminderBanner', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissions: [PERMISSIONS.USE_ATTENDANCE] });
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ permissions: [] });
    sessionStorage.clear();
  });

  it('si el sistema cerró la jornada, avisa de las horas extra con la hora de Colombia', async () => {
    mockStatus({ active: false, record: null, autoClosedAt: CIERRE_DE_JORNADA });

    renderBanner();

    expect(
      await screen.findByText(/Tu jornada se cerró automáticamente a las 7:00/),
    ).toBeInTheDocument();
    expect(screen.getByText(/marca entrada de nuevo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar Entrada/ })).toBeInTheDocument();
  });

  // Un descarte guardado en la sesión no puede esconder el aviso de la noche.
  it('muestra el aviso de horas extra aunque el recordatorio esté descartado en la sesión', async () => {
    sessionStorage.setItem('attendanceReminderDismissed', 'true');
    mockStatus({ active: false, record: null, autoClosedAt: CIERRE_DE_JORNADA });

    renderBanner();

    expect(
      await screen.findByText(/Tu jornada se cerró automáticamente/),
    ).toBeInTheDocument();
  });

  it('sin cierre automático muestra el recordatorio normal', async () => {
    mockStatus({ active: false, record: null, autoClosedAt: null });

    renderBanner();

    expect(await screen.findByText(/No has marcado tu entrada/)).toBeInTheDocument();
    expect(screen.queryByText(/Tu jornada se cerró/)).not.toBeInTheDocument();
  });

  it('con el recordatorio descartado en la sesión y sin cierre automático no muestra nada', async () => {
    sessionStorage.setItem('attendanceReminderDismissed', 'true');
    mockStatus({ active: false, record: null, autoClosedAt: null });

    renderBanner();

    await waitFor(() => expect(attendanceApi.getMyStatus).toHaveBeenCalled());
    expect(screen.queryByText(/No has marcado tu entrada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tu jornada se cerró/)).not.toBeInTheDocument();
  });

  it('con entrada activa no muestra nada', async () => {
    mockStatus({
      active: true,
      record: { id: 'r1', clockIn: '2026-09-15T13:00:00.000Z' } as AttendanceStatus['record'],
      autoClosedAt: null,
    });

    renderBanner();

    await waitFor(() => expect(attendanceApi.getMyStatus).toHaveBeenCalled());
    expect(screen.queryByText(/No has marcado tu entrada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tu jornada se cerró/)).not.toBeInTheDocument();
  });
});
