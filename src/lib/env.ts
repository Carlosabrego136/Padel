import { z } from 'zod';
import { AppError } from './errors';
import { log } from './log';

/**
 * Las variables se validan de forma perezosa (al usarse), no al importar el módulo,
 * para que `next build` funcione sin base de datos y los errores salgan con mensaje claro.
 */
const dbSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(10)
    .refine((v) => /^postgres(ql)?:\/\//i.test(v), 'DATABASE_URL debe empezar con postgres://'),
  DATABASE_CA: z.string().optional(),
});
const authSchema = z.object({ AUTH_SECRET: z.string().min(32, 'AUTH_SECRET debe tener al menos 32 caracteres') });
const cronSchema = z.object({ CRON_SECRET: z.string().min(16, 'CRON_SECRET debe tener al menos 16 caracteres') });

function parse<T extends z.ZodTypeAny>(schema: T, name: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    log.error('env_invalida', { grupo: name, problemas: result.error.issues.map((i) => i.path.join('.') + ': ' + i.message) });
    throw new AppError(500, 'Configuración del servidor incompleta', { code: 'env' });
  }
  return result.data;
}

export const getDbEnv = () => parse(dbSchema, 'db');
export const getAuthSecret = () => parse(authSchema, 'auth').AUTH_SECRET;
export const getCronSecret = () => parse(cronSchema, 'cron').CRON_SECRET;
