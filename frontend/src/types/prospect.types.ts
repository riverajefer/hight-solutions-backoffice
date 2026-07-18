export enum ProspectStatus {
  NUEVO = 'NUEVO',
  EN_SEGUIMIENTO = 'EN_SEGUIMIENTO',
  COTIZADO = 'COTIZADO',
  CONVERTIDO = 'CONVERTIDO',
  PERDIDO = 'PERDIDO',
  NO_INTERESADO = 'NO_INTERESADO',
}

export enum ContactMedium {
  WHATSAPP = 'WHATSAPP',
  LLAMADA = 'LLAMADA',
  CORREO = 'CORREO',
  PRESENCIAL = 'PRESENCIAL',
  REDES = 'REDES',
  OTRO = 'OTRO',
}

export enum ContactOutcome {
  CONTESTO = 'CONTESTO',
  NO_CONTESTO = 'NO_CONTESTO',
  SOLICITO_COTIZACION = 'SOLICITO_COTIZACION',
  NO_INTERESADO = 'NO_INTERESADO',
  REPROGRAMAR = 'REPROGRAMAR',
}

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  [ProspectStatus.NUEVO]: 'Nuevo',
  [ProspectStatus.EN_SEGUIMIENTO]: 'En seguimiento',
  [ProspectStatus.COTIZADO]: 'Cotizado',
  [ProspectStatus.CONVERTIDO]: 'Convertido',
  [ProspectStatus.PERDIDO]: 'Perdido',
  [ProspectStatus.NO_INTERESADO]: 'No interesado',
};

/** Colores de chip de MUI por estado. */
export const PROSPECT_STATUS_COLORS: Record<
  ProspectStatus,
  'default' | 'info' | 'primary' | 'success' | 'warning' | 'error'
> = {
  [ProspectStatus.NUEVO]: 'info',
  [ProspectStatus.EN_SEGUIMIENTO]: 'primary',
  [ProspectStatus.COTIZADO]: 'warning',
  [ProspectStatus.CONVERTIDO]: 'success',
  [ProspectStatus.PERDIDO]: 'error',
  [ProspectStatus.NO_INTERESADO]: 'default',
};

export const CONTACT_MEDIUM_LABELS: Record<ContactMedium, string> = {
  [ContactMedium.WHATSAPP]: 'WhatsApp',
  [ContactMedium.LLAMADA]: 'Llamada',
  [ContactMedium.CORREO]: 'Correo',
  [ContactMedium.PRESENCIAL]: 'Presencial',
  [ContactMedium.REDES]: 'Redes',
  [ContactMedium.OTRO]: 'Otro',
};

export const CONTACT_OUTCOME_LABELS: Record<ContactOutcome, string> = {
  [ContactOutcome.CONTESTO]: 'Contestó',
  [ContactOutcome.NO_CONTESTO]: 'No contestó',
  [ContactOutcome.SOLICITO_COTIZACION]: 'Solicitó cotización',
  [ContactOutcome.NO_INTERESADO]: 'No interesado',
  [ContactOutcome.REPROGRAMAR]: 'Reprogramar',
};

/**
 * Debe reflejar `ALLOWED_PROSPECT_TRANSITIONS` del backend. Se usa para
 * validar el arrastre en el kanban antes de mandar la petición.
 */
export const ALLOWED_PROSPECT_TRANSITIONS: Record<ProspectStatus, ProspectStatus[]> = {
  [ProspectStatus.NUEVO]: [
    ProspectStatus.EN_SEGUIMIENTO,
    ProspectStatus.COTIZADO,
    ProspectStatus.PERDIDO,
    ProspectStatus.NO_INTERESADO,
  ],
  [ProspectStatus.EN_SEGUIMIENTO]: [
    ProspectStatus.COTIZADO,
    ProspectStatus.CONVERTIDO,
    ProspectStatus.PERDIDO,
    ProspectStatus.NO_INTERESADO,
  ],
  [ProspectStatus.COTIZADO]: [
    ProspectStatus.CONVERTIDO,
    ProspectStatus.EN_SEGUIMIENTO,
    ProspectStatus.PERDIDO,
    ProspectStatus.NO_INTERESADO,
  ],
  [ProspectStatus.CONVERTIDO]: [],
  [ProspectStatus.PERDIDO]: [ProspectStatus.EN_SEGUIMIENTO],
  [ProspectStatus.NO_INTERESADO]: [ProspectStatus.EN_SEGUIMIENTO],
};

export interface ProspectAdvisor {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePhoto?: string | null;
}

export interface ProspectContact {
  id: string;
  prospectId: string;
  contactDate: string;
  medium: ContactMedium;
  outcome?: ContactOutcome | null;
  note?: string | null;
  createdAt: string;
  createdBy?: ProspectAdvisor;
}

export interface Prospect {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  observation?: string | null;
  status: ProspectStatus;
  advisorId: string;
  clientId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
  lastContactAt?: string | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
  advisor?: ProspectAdvisor;
  client?: { id: string; name: string } | null;
  quote?: { id: string; quoteNumber: string; status: string; orderId?: string | null } | null;
  order?: { id: string; orderNumber: string; status: string; total: string } | null;
  contacts?: ProspectContact[];
}

export interface CreateProspectDto {
  name?: string;
  phone?: string;
  email?: string;
  observation?: string;
  status?: ProspectStatus;
  advisorId?: string;
}

export interface UpdateProspectDto extends CreateProspectDto {
  quoteId?: string;
  orderId?: string;
  clientId?: string;
}

export interface CreateProspectContactDto {
  contactDate: string;
  medium: ContactMedium;
  outcome?: ContactOutcome;
  note?: string;
}

export interface FilterProspectsDto {
  status?: ProspectStatus;
  advisorId?: string;
  medium?: ContactMedium;
  dateFrom?: string;
  dateTo?: string;
  sinContactoDias?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export type ProspectConversionTarget = 'QUOTE' | 'ORDER';

export interface ConvertProspectDto {
  clientId: string;
  target: ProspectConversionTarget;
}

export interface ContactsByMedium {
  medium: ContactMedium;
  count: number;
}

export interface ProspectMetricsBucket {
  totalProspects: number;
  totalContacts: number;
  contactsByMedium: ContactsByMedium[];
  contactedProspects: number;
  responded: number;
  responseRate: number;
  quotesRequested: number;
  quotesGenerated: number;
  converted: number;
  conversionRate: number;
  totalRevenue: number;
}

export interface ProspectAdvisorMetrics extends ProspectMetricsBucket {
  advisorId: string;
  advisorName: string;
}

export interface ProspectMetrics extends ProspectMetricsBucket {
  advisorBreakdown: ProspectAdvisorMetrics[];
}

export interface ProspectMetricsFilterDto {
  dateFrom?: string;
  dateTo?: string;
  advisorId?: string;
}
