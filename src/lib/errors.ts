/**
 * Error controlado de la aplicación: su mensaje es seguro para mostrarse al usuario.
 * Cualquier otro error se registra en el log y se responde con un mensaje genérico.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, options?: { code?: string; fields?: Record<string, string> }) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = options?.code ?? 'error';
    this.fields = options?.fields;
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError(400, message, { code: 'bad_request', fields });
export const unauthorized = (message = 'Inicia sesión para continuar') =>
  new AppError(401, message, { code: 'unauthorized' });
export const forbidden = (message = 'No tienes permiso para esta acción') =>
  new AppError(403, message, { code: 'forbidden' });
export const notFound = (message = 'No encontrado') => new AppError(404, message, { code: 'not_found' });
export const conflict = (message: string) => new AppError(409, message, { code: 'conflict' });
export const tooMany = (message = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.') =>
  new AppError(429, message, { code: 'rate_limited' });
