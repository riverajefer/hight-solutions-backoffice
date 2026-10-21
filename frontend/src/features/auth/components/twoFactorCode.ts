import { z } from 'zod';

/** Código de 6 dígitos de la app autenticadora; tolera espacios al pegarlo. */
export const totpCodeSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos'));

/** Código de respaldo `ABCD-EFGH`, con o sin guion, en cualquier mayúscula. */
export const backupCodeSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/, 'El código de respaldo tiene 8 caracteres, como ABCD-EFGH'));

/** Código de la app o de respaldo, para los pasos que aceptan los dos. */
export const anyTwoFactorCodeSchema = z
  .string()
  .min(1, 'Escribe el código')
  .refine(
    (v) => totpCodeSchema.safeParse(v).success || backupCodeSchema.safeParse(v).success,
    'Escribe el código de 6 dígitos de la app o un código de respaldo',
  );

/** Props comunes del campo del código de la app: teclado numérico y autocompletar del SMS/llavero. */
export const totpInputProps = {
  inputMode: 'numeric' as const,
  autoComplete: 'one-time-code',
  maxLength: 7,
  style: { letterSpacing: '0.4em', fontSize: '1.4rem', textAlign: 'center' as const },
};
