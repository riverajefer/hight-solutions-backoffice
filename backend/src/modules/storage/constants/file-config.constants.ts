export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  SIGNED_URL_DEFAULT_EXPIRATION: 3600, // 1 hour in seconds
} as const;

export const ENTITY_TYPES = {
  ORDER: 'order',
  QUOTE: 'quote',
  USER: 'user',
  CLIENT: 'client',
  SUPPLIER: 'supplier',
  EXPENSE_ORDER: 'expense_order',
} as const;
