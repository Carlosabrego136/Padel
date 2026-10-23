import { z } from 'zod';

/** Validación y limpieza de TODAS las entradas (público y administradores) antes de tocar la base de datos. */

export const CATEGORIAS_SLUG = ['libre', 'tercera', 'cuarta', 'quinta', 'sexta', 'femenil'] as const;
export type CategoriaSlug = (typeof CATEGORIAS_SLUG)[number];

export function limpiarTexto(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clave canónica de un jugador: sin acentos, minúsculas, sin signos. Sirve para detectar duplicados. */
export function claveJugador(nombre: string): string {
  return limpiarTexto(nombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devuelve 10 dígitos o cadena vacía si el teléfono no es válido (acepta +52, 52, 521 y separadores). */
export function normalizarTelefono(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
  else if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
  return /^\d{10}$/.test(d) ? d : '';
}

const nombreSchema = z
  .string({ required_error: 'Escribe el nombre completo' })
  .transform(limpiarTexto)
  .pipe(
    z
      .string()
      .min(3, 'Escribe el nombre completo')
      .max(60, 'El nombre es demasiado largo')
      .regex(/^\p{L}[\p{L}\p{M}'’.\- ]*\p{L}\.?$/u, 'El nombre solo puede llevar letras, espacios, guion o apóstrofo'),
  );

const telefonoSchema = z
  .string({ required_error: 'Escribe un teléfono de 10 dígitos' })
  .transform(normalizarTelefono)
  .refine((v) => v !== '', 'Escribe un teléfono celular de 10 dígitos');

const telefonoOpcionalSchema = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? normalizarTelefono(v) : undefined))
  .refine((v) => v === undefined || v !== '', 'El teléfono debe tener 10 dígitos');

const jugadorSchema = z.object({
  nombre: nombreSchema,
  genero: z.enum(['M', 'F'], { errorMap: () => ({ message: 'Selecciona hombre o mujer' }) }),
  telefono: telefonoOpcionalSchema,
});

export const inscripcionSchema = z
  .object({
    categoria: z.enum(CATEGORIAS_SLUG, { errorMap: () => ({ message: 'Selecciona una categoría' }) }),
    jugador1: jugadorSchema,
    jugador2: jugadorSchema,
    telefonoContacto: telefonoSchema,
    aceptaPublicar: z.literal(true, { errorMap: () => ({ message: 'Debes autorizar la publicación del teléfono de contacto' }) }),
    aceptaReglamento: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar el reglamento' }) }),
  })
  .superRefine((v, ctx) => {
    if (claveJugador(v.jugador1.nombre) === claveJugador(v.jugador2.nombre)) {
      ctx.addIssue({ code: 'custom', path: ['jugador2', 'nombre'], message: 'Los dos jugadores deben ser personas distintas' });
    }
    if (v.categoria === 'femenil') {
      if (v.jugador1.genero !== 'F') ctx.addIssue({ code: 'custom', path: ['jugador1', 'genero'], message: 'La categoría Femenil es solo para mujeres' });
      if (v.jugador2.genero !== 'F') ctx.addIssue({ code: 'custom', path: ['jugador2', 'genero'], message: 'La categoría Femenil es solo para mujeres' });
    }
  });
export type InscripcionInput = z.infer<typeof inscripcionSchema>;

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid('Identificador no válido');

export const loginSchema = z.object({
  email: z.string().max(254),
  password: z.string().max(128),
});

export const aprobarSchema = z.object({ pagoConfirmado: z.boolean() });

export const motivoSchema = z.object({
  motivo: z.string().transform(limpiarTexto).pipe(z.string().min(5, 'Escribe un motivo (mínimo 5 caracteres)').max(300)),
});

export const editarParejaSchema = z
  .object({
    telefonoContacto: telefonoSchema,
    jugador1: z.object({ nombre: nombreSchema, genero: z.enum(['M', 'F']), telefono: telefonoOpcionalSchema }),
    jugador2: z.object({ nombre: nombreSchema, genero: z.enum(['M', 'F']), telefono: telefonoOpcionalSchema }),
  })
  .superRefine((v, ctx) => {
    if (claveJugador(v.jugador1.nombre) === claveJugador(v.jugador2.nombre)) {
      ctx.addIssue({ code: 'custom', path: ['jugador2', 'nombre'], message: 'Los dos jugadores deben ser distintos' });
    }
  });

export const sorteoSchema = z.object({ categoriaId: z.number().int().min(1).max(6) });

const fechaHoraLocalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Fecha y hora no válidas')
  .refine((v) => !Number.isNaN(Date.parse(v + ':00Z')), 'Fecha y hora no válidas');

export const crearPartidoSchema = z.object({
  tipo: z.enum(['reto', 'ascenso']),
  retadoraId: uuidSchema,
  jornadaId: z.number().int().min(1),
  fechaJuego: fechaHoraLocalSchema.optional().or(z.literal('').transform(() => undefined)),
  cancha: z.number().int().min(1).max(12).optional(),
});

export const programarSchema = z.object({
  fechaJuego: fechaHoraLocalSchema.optional().or(z.literal('').transform(() => undefined)),
  cancha: z.number().int().min(1).max(12).optional(),
});

export const resultadoSchema = z.object({
  sets: z
    .array(z.object({ a: z.number().int().min(0).max(99), b: z.number().int().min(0).max(99) }))
    .min(2, 'Captura al menos 2 sets')
    .max(3, 'Máximo 3 sets'),
});

export const resolverSchema = z.object({
  ganadoraId: uuidSchema,
  nota: z.string().transform(limpiarTexto).pipe(z.string().min(10, 'Explica la resolución (mínimo 10 caracteres)').max(500)),
});

// ---------------------------------------------------------------------------
// Configuración editable desde el panel
// ---------------------------------------------------------------------------

const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;

export interface ConfigDef {
  etiqueta: string;
  ayuda?: string;
  validar: (valor: string) => string | null; // devuelve mensaje de error o null
}

const fecha = (etiqueta: string, ayuda?: string, extra?: (v: string) => string | null): ConfigDef => ({
  etiqueta,
  ayuda,
  validar: (v) => (!esFecha(v) ? 'Usa el formato AAAA-MM-DD' : (extra?.(v) ?? null)),
});
const entero = (etiqueta: string, min: number, max: number): ConfigDef => ({
  etiqueta,
  validar: (v) => (/^\d{1,5}$/.test(v) && +v >= min && +v <= max ? null : `Debe ser un número entre ${min} y ${max}`),
});

export const CONFIG_DEFS: Record<string, ConfigDef> = {
  inicio_ranking: fecha('Inicio del ranking', 'Debe ser martes. Regenera las jornadas sin partidos.', (v) =>
    new Date(v + 'T00:00:00Z').getUTCDay() === 2 ? null : 'Debe ser martes',
  ),
  fin_ranking: fecha('Fin del ranking'),
  fecha_limite_inscripcion: fecha('Fecha límite de inscripción (inclusive)', 'Hasta este día aplica la cuota inicial.'),
  pausa_inicio: fecha('Inicio de la pausa'),
  pausa_fin: fecha('Fin de la pausa'),
  zona_horaria: {
    etiqueta: 'Zona horaria',
    ayuda: 'Tepic, Nayarit: America/Mazatlan',
    validar: (v) => {
      try {
        new Intl.DateTimeFormat('es-MX', { timeZone: v });
        return null;
      } catch {
        return 'Zona horaria no válida';
      }
    },
  },
  cuota_inicial: entero('Cuota inicial por jugador ($)', 0, 5000),
  cuota_tardia: entero('Cuota posterior a la fecha límite ($)', 0, 5000),
  eximir_primer_lugar: {
    etiqueta: 'Eximir al 1er lugar del descenso por inactividad',
    ayuda: 'true = el 1er lugar no baja si no jugó (no tiene a quién retar hacia arriba).',
    validar: (v) => (v === 'true' || v === 'false' ? null : 'Debe ser true o false'),
  },
  num_canchas: entero('Número de canchas', 1, 12),
  club_telefono: { etiqueta: 'Teléfono del club (10 dígitos)', validar: (v) => (/^\d{10}$/.test(v) ? null : 'Debe tener 10 dígitos') },
  club_direccion: {
    etiqueta: 'Dirección del club',
    ayuda: 'Se muestra de forma destacada en la página principal.',
    validar: (v) => (v.length >= 5 && v.length <= 200 && !/[<>]/.test(v) ? null : 'Escribe una dirección válida (5-200 caracteres)'),
  },
  club_instagram: { etiqueta: 'Instagram (usuario)', validar: (v) => (/^[A-Za-z0-9._]{1,30}$/.test(v) ? null : 'Usuario no válido') },
  club_facebook: { etiqueta: 'Facebook (nombre de la página)', validar: (v) => (v.length >= 2 && v.length <= 60 && !/[<>]/.test(v) ? null : 'Nombre no válido') },
  club_sitio: {
    etiqueta: 'Sitio web del club',
    validar: (v) => {
      try {
        const u = new URL(v);
        return u.protocol === 'https:' ? null : 'Debe empezar con https://';
      } catch {
        return 'URL no válida';
      }
    },
  },
};

export const configSchema = z.object({
  clave: z.string().refine((k) => k in CONFIG_DEFS, 'Configuración desconocida'),
  valor: z.string().transform(limpiarTexto).pipe(z.string().min(1, 'El valor no puede estar vacío').max(200)),
});
