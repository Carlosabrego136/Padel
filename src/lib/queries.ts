import { query } from './db';
import { notFound } from './errors';
import { uuidSchema } from './validation';

/**
 * Capa de SOLO LECTURA: todas las consultas a la base de datos que no modifican datos.
 * Todas usan parámetros ($1, $2…), nunca interpolación de cadenas.
 * Los límites están acotados a 200 registros como máximo.
 */

const clamp = (n: number | undefined, def: number, max: number): number =>
  Math.max(1, Math.min(n ?? def, max));

const validateUuid = (id: string, label = 'ID'): string => {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw notFound(`${label} no válido`);
  return parsed.data;
};

// ============================================================================
// Tipos públicos
// ============================================================================

export interface ConfigMap {
  [clave: string]: string;
}

export interface CategoriaRow {
  id: number;
  slug: string;
  nombre: string;
  orden: number;
  superior_id: number | null;
  solo_femenil: boolean;
  sorteo_realizado: boolean;
  sorteo_en: string | null;
}

export interface JugadorResumen {
  id: string;
  nombre: string;
  clave: string;
  genero: string;
  telefono: string | null;
  tiene_foto: boolean;
}

export interface ParejaRanking {
  id: string;
  categoria_id: number;
  posicion: number | null;
  telefono_contacto: string;
  acepta_publicar: boolean;
  mixta: boolean;
  creada_en: string;
  jugadores: JugadorResumen[];
}

export interface JornadaRow {
  id: number;
  numero: number | null;
  inicio: string;
  cierre: string;
  tipo: string;
  estado: string;
  cerrada_en: string | null;
}

export interface PartidoConNombres {
  id: string;
  jornada_id: number;
  tipo: string;
  retadora_id: string;
  retada_id: string;
  categoria_retadora_id: number;
  categoria_retada_id: number;
  pos_retadora: number;
  pos_retada: number;
  fecha_juego: string | null;
  cancha: number | null;
  estado: string;
  sets: unknown;
  ganadora_id: string | null;
  nota: string | null;
  jugado_en: string | null;
  creado_en: string;
  retadora_nombres: string;
  retada_nombres: string;
}

export interface MovimientoRow {
  id: string;
  jornada_id: number | null;
  pareja_id: string;
  categoria_antes: number | null;
  pos_antes: number | null;
  categoria_despues: number | null;
  pos_despues: number | null;
  motivo: string;
  creado_en: string;
}

export interface ParejaEstadisticas {
  jugados: number;
  ganados: number;
  perdidos: number;
  efectividad: number; // 0-100
  /** Racha actual: positiva = victorias seguidas, negativa = derrotas seguidas, 0 = sin partidos. */
  racha: number;
}

export interface ParejaDetalle extends ParejaRanking {
  estado: string;
  cuota_por_jugador: number;
  pago_confirmado: boolean;
  motivo_cierre: string | null;
  aprobada_en: string | null;
  retirada_en: string | null;
  partidos: PartidoConNombres[];
  movimientos: MovimientoRow[];
  estadisticas: ParejaEstadisticas;
}

export interface FotoResult {
  foto: Buffer;
  mime: string;
}

// ============================================================================
// Tipos admin
// ============================================================================

export interface ParejaAdmin {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  estado: string;
  posicion: number | null;
  telefono_contacto: string;
  acepta_publicar: boolean;
  mixta: boolean;
  cuota_por_jugador: number;
  pago_confirmado: boolean;
  motivo_cierre: string | null;
  es_demo: boolean;
  creada_en: string;
  aprobada_en: string | null;
  retirada_en: string | null;
  jugadores: JugadorResumen[];
}

export interface ParejaAdminDetalle extends ParejaAdmin {
  jugadores: (JugadorResumen & { tiene_foto: boolean })[];
  partidos: PartidoConNombres[];
  movimientos: MovimientoRow[];
}

export interface AuditLogRow {
  id: string;
  ts: string;
  actor_id: string | null;
  actor: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  antes: unknown;
  despues: unknown;
  detalle: string | null;
  ip: string | null;
}

export interface AuditCambiosRow {
  id: string;
  ts: string;
  actor: string;
  tabla: string;
  operacion: string;
  fila_id: string | null;
  antes: unknown;
  despues: unknown;
}

export interface ConfigRow {
  clave: string;
  valor: string;
  actualizado_en: string;
}

export interface DashboardData {
  parejas_por_estado: { estado: string; total: number }[];
  total_jugadores: number;
  jornadas_total: number;
  jornadas_cerradas: number;
  proxima_jornada: JornadaRow | null;
}

export interface AdminRow {
  id: string;
  email: string;
  nombre: string | null;
  activo: boolean;
  creado_en: string;
  ultimo_acceso: string | null;
}

// ============================================================================
// Funciones auxiliares para agrupar jugadores
// ============================================================================

interface ParejaFlatRow {
  id: string;
  [key: string]: unknown;
  j_id: string | null;
  j_nombre: string | null;
  j_clave: string | null;
  j_genero: string | null;
  j_telefono: string | null;
  j_tiene_foto: boolean | null;
}

function agruparJugadores<T>(
  rows: ParejaFlatRow[],
): (T & { jugadores: JugadorResumen[] })[] {
  const map = new Map<string, T & { jugadores: JugadorResumen[] }>();
  for (const row of rows) {
    let entry = map.get(row.id);
    if (!entry) {
      const { j_id, j_nombre, j_clave, j_genero, j_telefono, j_tiene_foto, ...rest } = row;
      entry = { ...(rest as unknown as T), jugadores: [] };
      map.set(row.id, entry);
    }
    if (row.j_id) {
      entry.jugadores.push({
        id: row.j_id as string,
        nombre: row.j_nombre as string,
        clave: row.j_clave as string,
        genero: row.j_genero as string,
        telefono: row.j_telefono as string | null,
        tiene_foto: !!row.j_tiene_foto,
      });
    }
  }
  return [...map.values()];
}

const PAREJA_COLS = `p.id, p.categoria_id, p.estado, p.posicion, p.telefono_contacto,
  p.acepta_publicar, p.mixta, p.cuota_por_jugador, p.pago_confirmado,
  p.motivo_cierre, p.es_demo, p.creada_en, p.aprobada_en, p.retirada_en`;

const JUGADOR_COLS = `j.id AS j_id, j.nombre AS j_nombre, j.clave AS j_clave,
  j.genero AS j_genero, j.telefono AS j_telefono, (j.foto IS NOT NULL) AS j_tiene_foto`;

const PARTIDO_NOMBRES_SELECT = `
  p2.id, p2.jornada_id, p2.tipo,
  p2.retadora_id, p2.retada_id,
  p2.categoria_retadora_id, p2.categoria_retada_id,
  p2.pos_retadora, p2.pos_retada,
  p2.fecha_juego, p2.cancha, p2.estado,
  p2.sets, p2.ganadora_id, p2.nota, p2.jugado_en, p2.creado_en,
  (SELECT string_agg(j3.nombre, ' / ' ORDER BY j3.creado_en) FROM jugadores j3 WHERE j3.pareja_id = p2.retadora_id AND j3.activo) AS retadora_nombres,
  (SELECT string_agg(j4.nombre, ' / ' ORDER BY j4.creado_en) FROM jugadores j4 WHERE j4.pareja_id = p2.retada_id AND j4.activo) AS retada_nombres`;

// ============================================================================
// Consultas PÚBLICAS
// ============================================================================

export async function getConfig(): Promise<Map<string, string>> {
  const r = await query<{ clave: string; valor: string }>('SELECT clave, valor FROM configuracion');
  return new Map(r.rows.map((row) => [row.clave, row.valor]));
}

export async function getCategorias(): Promise<CategoriaRow[]> {
  const r = await query<CategoriaRow>('SELECT * FROM categorias ORDER BY orden');
  return r.rows;
}

export async function getRankingCategoria(categoriaId: number): Promise<ParejaRanking[]> {
  if (!Number.isInteger(categoriaId) || categoriaId < 1 || categoriaId > 6) return [];
  const r = await query<ParejaFlatRow>(
    `SELECT ${PAREJA_COLS}, ${JUGADOR_COLS}
     FROM parejas p
     LEFT JOIN jugadores j ON j.pareja_id = p.id AND j.activo
     WHERE p.estado = 'aprobada' AND p.categoria_id = $1
     ORDER BY p.posicion NULLS LAST, p.creada_en`,
    [categoriaId],
  );
  return agruparJugadores<ParejaRanking>(r.rows);
}

export async function getJornadaActual(tz: string): Promise<JornadaRow | null> {
  // tz is used for display only; the comparison uses timestamptz directly
  const r = await query<JornadaRow>(
    `SELECT * FROM jornadas
     WHERE estado = 'programada' AND tipo = 'normal'
       AND inicio <= now() AND cierre > now()
     ORDER BY inicio LIMIT 1`,
  );
  return r.rows[0] ?? null;
}

export async function getPartidosJornada(jornadaId: number): Promise<PartidoConNombres[]> {
  if (!Number.isInteger(jornadaId) || jornadaId < 1) return [];
  const r = await query<PartidoConNombres>(
    `SELECT ${PARTIDO_NOMBRES_SELECT}
     FROM partidos p2
     WHERE p2.jornada_id = $1
     ORDER BY p2.tipo DESC, p2.categoria_retadora_id, p2.pos_retada`,
    [jornadaId],
  );
  return r.rows;
}

/** Calcula ganados/perdidos/racha a partir del historial completo de partidos jugados de una pareja. */
function calcularEstadisticas(
  parejaId: string,
  partidosJugadosAsc: { retadora_id: string; ganadora_id: string | null }[],
): ParejaEstadisticas {
  let ganados = 0;
  let perdidos = 0;
  let racha = 0;

  for (const p of partidosJugadosAsc) {
    if (!p.ganadora_id) continue;
    const gano = p.ganadora_id === parejaId;
    if (gano) {
      ganados++;
      racha = racha >= 0 ? racha + 1 : 1;
    } else {
      perdidos++;
      racha = racha <= 0 ? racha - 1 : -1;
    }
  }

  const jugados = ganados + perdidos;
  const efectividad = jugados > 0 ? Math.round((ganados / jugados) * 100) : 0;
  return { jugados, ganados, perdidos, efectividad, racha };
}

export async function getPareja(id: string): Promise<ParejaDetalle | null> {
  const uid = validateUuid(id, 'Pareja');
  const r = await query<ParejaFlatRow>(
    `SELECT ${PAREJA_COLS}, ${JUGADOR_COLS}
     FROM parejas p
     LEFT JOIN jugadores j ON j.pareja_id = p.id AND j.activo
     WHERE p.id = $1`,
    [uid],
  );
  if (r.rows.length === 0) return null;

  const [pareja] = agruparJugadores<ParejaDetalle>(r.rows);

  const [partR, movR, statsR] = await Promise.all([
    query<PartidoConNombres>(
      `SELECT ${PARTIDO_NOMBRES_SELECT}
       FROM partidos p2
       WHERE p2.retadora_id = $1 OR p2.retada_id = $1
       ORDER BY p2.creado_en DESC LIMIT 10`,
      [uid],
    ),
    query<MovimientoRow>(
      `SELECT * FROM movimientos WHERE pareja_id = $1 ORDER BY creado_en DESC LIMIT 10`,
      [uid],
    ),
    query<{ retadora_id: string; ganadora_id: string | null }>(
      `SELECT retadora_id, ganadora_id FROM partidos
       WHERE (retadora_id = $1 OR retada_id = $1) AND estado IN ('jugado', 'resuelto_club')
       ORDER BY jugado_en ASC LIMIT 500`,
      [uid],
    ),
  ]);

  pareja.partidos = partR.rows;
  pareja.movimientos = movR.rows;
  pareja.estadisticas = calcularEstadisticas(uid, statsR.rows);
  return pareja;
}

export async function getMovimientosPareja(parejaId: string, limit?: number): Promise<MovimientoRow[]> {
  const uid = validateUuid(parejaId, 'Pareja');
  const lim = clamp(limit, 20, 200);
  const r = await query<MovimientoRow>(
    'SELECT * FROM movimientos WHERE pareja_id = $1 ORDER BY creado_en DESC LIMIT $2',
    [uid, lim],
  );
  return r.rows;
}

export async function getJugadorFoto(jugadorId: string): Promise<FotoResult | null> {
  const uid = validateUuid(jugadorId, 'Jugador');
  const r = await query<{ foto: Buffer | null; foto_mime: string | null }>(
    'SELECT foto, foto_mime FROM jugadores WHERE id = $1',
    [uid],
  );
  const row = r.rows[0];
  if (!row?.foto) return null;
  return { foto: row.foto, mime: row.foto_mime ?? 'image/webp' };
}

// ============================================================================
// Consultas ADMIN
// ============================================================================

export async function adminGetParejas(
  categoriaId?: number,
  estado?: string,
): Promise<ParejaAdmin[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (categoriaId !== undefined) {
    if (!Number.isInteger(categoriaId) || categoriaId < 1 || categoriaId > 6) return [];
    conditions.push(`p.categoria_id = $${idx++}`);
    params.push(categoriaId);
  }
  if (estado !== undefined) {
    const VALID_ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'retirada'];
    if (!VALID_ESTADOS.includes(estado)) return [];
    conditions.push(`p.estado = $${idx++}`);
    params.push(estado);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const r = await query<ParejaFlatRow & { categoria_nombre: string }>(
    `SELECT ${PAREJA_COLS}, c.nombre AS categoria_nombre, ${JUGADOR_COLS}
     FROM parejas p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN jugadores j ON j.pareja_id = p.id AND j.activo
     ${where}
     ORDER BY p.categoria_id, p.posicion NULLS LAST, p.creada_en
     LIMIT 400`,
    params,
  );
  return agruparJugadores<ParejaAdmin>(r.rows as ParejaFlatRow[]);
}

export async function adminGetPareja(id: string): Promise<ParejaAdminDetalle | null> {
  const uid = validateUuid(id, 'Pareja');
  const r = await query<ParejaFlatRow & { categoria_nombre: string }>(
    `SELECT ${PAREJA_COLS}, c.nombre AS categoria_nombre, ${JUGADOR_COLS}
     FROM parejas p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN jugadores j ON j.pareja_id = p.id AND j.activo
     WHERE p.id = $1`,
    [uid],
  );
  if (r.rows.length === 0) return null;

  const [pareja] = agruparJugadores<ParejaAdminDetalle>(r.rows as ParejaFlatRow[]);

  const [partR, movR] = await Promise.all([
    query<PartidoConNombres>(
      `SELECT ${PARTIDO_NOMBRES_SELECT}
       FROM partidos p2
       WHERE p2.retadora_id = $1 OR p2.retada_id = $1
       ORDER BY p2.creado_en DESC LIMIT 50`,
      [uid],
    ),
    query<MovimientoRow>(
      'SELECT * FROM movimientos WHERE pareja_id = $1 ORDER BY creado_en DESC LIMIT 50',
      [uid],
    ),
  ]);

  pareja.partidos = partR.rows;
  pareja.movimientos = movR.rows;
  return pareja;
}

export async function adminGetJornadas(): Promise<JornadaRow[]> {
  const r = await query<JornadaRow>('SELECT * FROM jornadas ORDER BY inicio');
  return r.rows;
}

export async function adminGetPartidos(jornadaId: number): Promise<PartidoConNombres[]> {
  if (!Number.isInteger(jornadaId) || jornadaId < 1) return [];
  const r = await query<PartidoConNombres>(
    `SELECT ${PARTIDO_NOMBRES_SELECT}
     FROM partidos p2
     WHERE p2.jornada_id = $1
     ORDER BY p2.tipo DESC, p2.categoria_retadora_id, p2.pos_retada`,
    [jornadaId],
  );
  return r.rows;
}

export async function adminGetAuditLog(opts: {
  limit?: number;
  offset?: number;
  entidad?: string;
}): Promise<{ rows: AuditLogRow[]; total: number }> {
  const lim = clamp(opts.limit, 50, 200);
  const off = Math.max(0, opts.offset ?? 0);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.entidad) {
    conditions.push(`entidad = $${idx++}`);
    params.push(opts.entidad);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(lim, off);
  const limIdx = idx++;
  const offIdx = idx++;

  const [dataR, countR] = await Promise.all([
    query<AuditLogRow>(
      `SELECT * FROM audit_log ${where} ORDER BY ts DESC LIMIT $${limIdx} OFFSET $${offIdx}`,
      params,
    ),
    query<{ total: string }>(
      `SELECT count(*)::text AS total FROM audit_log ${where}`,
      countParams,
    ),
  ]);

  return { rows: dataR.rows, total: parseInt(countR.rows[0]?.total ?? '0', 10) };
}

export async function adminGetAuditCambios(opts: {
  limit?: number;
  offset?: number;
  tabla?: string;
}): Promise<{ rows: AuditCambiosRow[]; total: number }> {
  const lim = clamp(opts.limit, 50, 200);
  const off = Math.max(0, opts.offset ?? 0);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.tabla) {
    conditions.push(`tabla = $${idx++}`);
    params.push(opts.tabla);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(lim, off);
  const limIdx = idx++;
  const offIdx = idx++;

  const [dataR, countR] = await Promise.all([
    query<AuditCambiosRow>(
      `SELECT * FROM audit_cambios ${where} ORDER BY ts DESC LIMIT $${limIdx} OFFSET $${offIdx}`,
      params,
    ),
    query<{ total: string }>(
      `SELECT count(*)::text AS total FROM audit_cambios ${where}`,
      countParams,
    ),
  ]);

  return { rows: dataR.rows, total: parseInt(countR.rows[0]?.total ?? '0', 10) };
}

export async function adminGetConfig(): Promise<ConfigRow[]> {
  const r = await query<ConfigRow>('SELECT * FROM configuracion ORDER BY clave');
  return r.rows;
}

export async function adminGetDashboard(): Promise<DashboardData> {
  const [estadosR, jugR, jornadasR, proximaR] = await Promise.all([
    query<{ estado: string; total: string }>(
      `SELECT estado, count(*)::text AS total FROM parejas GROUP BY estado ORDER BY estado`,
    ),
    query<{ total: string }>('SELECT count(*)::text AS total FROM jugadores WHERE activo'),
    query<{ total: string; cerradas: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE estado = 'cerrada')::text AS cerradas
       FROM jornadas WHERE tipo = 'normal'`,
    ),
    query<JornadaRow>(
      `SELECT * FROM jornadas
       WHERE estado = 'programada' AND tipo = 'normal'
       ORDER BY inicio LIMIT 1`,
    ),
  ]);

  return {
    parejas_por_estado: estadosR.rows.map((r) => ({ estado: r.estado, total: parseInt(r.total, 10) })),
    total_jugadores: parseInt(jugR.rows[0]?.total ?? '0', 10),
    jornadas_total: parseInt(jornadasR.rows[0]?.total ?? '0', 10),
    jornadas_cerradas: parseInt(jornadasR.rows[0]?.cerradas ?? '0', 10),
    proxima_jornada: proximaR.rows[0] ?? null,
  };
}

export async function adminGetAdmins(): Promise<AdminRow[]> {
  const r = await query<AdminRow>(
    `SELECT id, email, nombre, activo, creado_en, ultimo_acceso
     FROM admins ORDER BY creado_en`,
  );
  return r.rows;
}
