/**
 * Capa de escritura / lógica de negocio del ranking de Pádel Life.
 *
 * Cada función que modifica datos opera dentro de una transacción con actor
 * obligatorio (withTx / withAdminTx) y registra la auditoría correspondiente.
 *
 * Reglas del código:
 *  1. Todo bucle tiene límite de iteraciones.
 *  2. Try/catch explícito, errores registrados, nunca se cuelga.
 *  3. Código completo de producción, sin placeholders.
 *  4. Toda entrada se valida antes de operar.
 *  5. Toda escritura administrativa registra quién, cuándo y qué en audit_log.
 */

import { randomInt } from 'node:crypto';
import { withTx, withAdminTx, query, type Actor, type Tx } from '../db';
import { badRequest, conflict, notFound, forbidden } from '../errors';
import { log, serializeError } from '../log';
import { limpiarTexto, claveJugador, type InscripcionInput, CONFIG_DEFS } from '../validation';
import { limitar } from '../auth';
import { aplicarSemana, aplicarAscenso, type RetoResuelto, type AscensoResuelto } from './engine';
import { evaluarMarcador } from './score';
import { procesarFoto } from '../photo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_LOOP = 200;

/** Lee una clave de configuración dentro de una transacción. */
async function configVal(tx: Tx, clave: string): Promise<string> {
  const r = await tx.query<{ valor: string }>('SELECT valor FROM configuracion WHERE clave = $1', [clave]);
  if (!r.rows[0]) throw new Error(`Configuración faltante: ${clave}`);
  return r.rows[0].valor;
}

/** Lee varias claves de configuración de un solo golpe. */
async function configVals(tx: Tx, claves: string[]): Promise<Map<string, string>> {
  const r = await tx.query<{ clave: string; valor: string }>(
    'SELECT clave, valor FROM configuracion WHERE clave = ANY($1)',
    [claves],
  );
  return new Map(r.rows.map((row) => [row.clave, row.valor]));
}

function validarUuid(id: string, nombre: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw badRequest(`${nombre} no es un identificador válido`);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Inscripción pública
// ---------------------------------------------------------------------------

export interface ParejaCreada {
  parejaId: string;
  jugador1Id: string;
  jugador2Id: string;
}

export async function registrarPareja(
  data: InscripcionInput,
  foto1: File | null | undefined,
  foto2: File | null | undefined,
  ip: string | null,
): Promise<ParejaCreada> {
  // Rate limit por IP
  if (ip) {
    await limitar(`inscripcion:ip:${ip}`, 10, 3600);
  }

  // Procesar fotos fuera de la transacción (CPU-intensivo)
  const [fotoProc1, fotoProc2] = await Promise.all([
    procesarFoto(foto1, 'jugador 1'),
    procesarFoto(foto2, 'jugador 2'),
  ]);

  const actor: Actor = { id: null, label: 'publico', ip };

  return withTx(actor, async (tx) => {
    // Categoría existe
    const catR = await tx.query<{ id: number }>(
      "SELECT id FROM categorias WHERE slug = $1",
      [data.categoria],
    );
    if (!catR.rows[0]) throw badRequest('Categoría no válida');
    const categoriaId = catR.rows[0].id;

    // Calcular cuota
    const cfg = await configVals(tx, ['fecha_limite_inscripcion', 'cuota_inicial', 'cuota_tardia']);
    const limite = cfg.get('fecha_limite_inscripcion') ?? '2099-12-31';
    const hoy = new Date().toISOString().slice(0, 10);
    const cuota = hoy <= limite
      ? parseInt(cfg.get('cuota_inicial') ?? '200', 10)
      : parseInt(cfg.get('cuota_tardia') ?? '300', 10);

    // Crear pareja
    const parejaR = await tx.query<{ id: string }>(
      `INSERT INTO parejas (categoria_id, telefono_contacto, acepta_publicar, mixta, cuota_por_jugador)
       VALUES ($1, $2, true, $3, $4)
       RETURNING id`,
      [
        categoriaId,
        data.telefonoContacto,
        data.jugador1.genero !== data.jugador2.genero,
        cuota,
      ],
    );
    const parejaId = parejaR.rows[0].id;

    // Insertar jugadores
    const insertJugador = async (
      j: { nombre: string; genero: string; telefono?: string },
      foto: Awaited<ReturnType<typeof procesarFoto>>,
      etiqueta: string,
    ): Promise<string> => {
      const clave = claveJugador(j.nombre);
      if (clave.length < 3) throw badRequest(`El nombre de ${etiqueta} es demasiado corto`);
      try {
        const r = await tx.query<{ id: string }>(
          `INSERT INTO jugadores (pareja_id, nombre, clave, genero, telefono, foto, foto_mime)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            parejaId,
            limpiarTexto(j.nombre),
            clave,
            j.genero,
            j.telefono || null,
            foto?.data ?? null,
            foto?.mime ?? null,
          ],
        );
        return r.rows[0].id;
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === '23505') {
          throw conflict(`${limpiarTexto(j.nombre)} ya está inscrito/a en otra pareja activa`);
        }
        throw err;
      }
    };

    const jugador1Id = await insertJugador(data.jugador1, fotoProc1, 'jugador 1');
    const jugador2Id = await insertJugador(data.jugador2, fotoProc2, 'jugador 2');

    await tx.audit({
      accion: 'inscripcion',
      entidad: 'pareja',
      entidadId: parejaId,
      despues: {
        categoriaId,
        categoria: data.categoria,
        jugador1: data.jugador1.nombre,
        jugador2: data.jugador2.nombre,
        cuota,
      },
    });

    return { parejaId, jugador1Id, jugador2Id };
  });
}

// ---------------------------------------------------------------------------
// Admin: Parejas
// ---------------------------------------------------------------------------

export async function aprobarPareja(parejaId: string, pagoConfirmado: boolean, actor: Actor): Promise<void> {
  validarUuid(parejaId, 'pareja');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{ id: string; estado: string; categoria_id: number }>(
      "SELECT id, estado, categoria_id FROM parejas WHERE id = $1 FOR UPDATE",
      [parejaId],
    );
    const pareja = r.rows[0];
    if (!pareja) throw notFound('Pareja no encontrada');
    if (pareja.estado !== 'pendiente') throw conflict(`La pareja ya tiene estado "${pareja.estado}"`);

    // Si el sorteo inicial de la categoría ya se hizo, esta es una inscripción tardía:
    // entra directo al último lugar disponible, tal como lo indica la convocatoria del club.
    // Se bloquea la fila de la categoría para que dos aprobaciones simultáneas no calculen
    // el mismo "último lugar" y choquen entre sí.
    const catR = await tx.query<{ sorteo_realizado: boolean }>(
      "SELECT sorteo_realizado FROM categorias WHERE id = $1 FOR UPDATE",
      [pareja.categoria_id],
    );
    const sorteoHecho = catR.rows[0]?.sorteo_realizado ?? false;

    let posicionNueva: number | null = null;
    if (sorteoHecho) {
      await tx.query('SET CONSTRAINTS parejas_posicion_unica DEFERRED');
      const maxR = await tx.query<{ maxp: number | null }>(
        `SELECT MAX(posicion) AS maxp FROM parejas WHERE categoria_id = $1 AND estado = 'aprobada'`,
        [pareja.categoria_id],
      );
      posicionNueva = (maxR.rows[0]?.maxp ?? 0) + 1;
    }

    await tx.query(
      `UPDATE parejas SET estado = 'aprobada', pago_confirmado = $2, aprobada_en = now(), posicion = $3 WHERE id = $1`,
      [parejaId, pagoConfirmado, posicionNueva],
    );

    await tx.audit({
      accion: 'aprobar_pareja',
      entidad: 'pareja',
      entidadId: parejaId,
      antes: { estado: 'pendiente' },
      despues: {
        estado: 'aprobada',
        pago_confirmado: pagoConfirmado,
        posicion: posicionNueva,
        inscripcion_tardia: sorteoHecho,
      },
    });
  });
}

export async function rechazarPareja(parejaId: string, motivo: string, actor: Actor): Promise<void> {
  validarUuid(parejaId, 'pareja');
  motivo = limpiarTexto(motivo);
  if (motivo.length < 5) throw badRequest('El motivo debe tener al menos 5 caracteres');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{ id: string; estado: string }>(
      "SELECT id, estado FROM parejas WHERE id = $1 FOR UPDATE",
      [parejaId],
    );
    const pareja = r.rows[0];
    if (!pareja) throw notFound('Pareja no encontrada');
    if (pareja.estado !== 'pendiente') throw conflict(`Solo se puede rechazar una pareja pendiente (actual: "${pareja.estado}")`);

    await tx.query(
      `UPDATE parejas SET estado = 'rechazada', motivo_cierre = $2 WHERE id = $1`,
      [parejaId, motivo],
    );
    await tx.query(`UPDATE jugadores SET activo = false WHERE pareja_id = $1`, [parejaId]);

    await tx.audit({
      accion: 'rechazar_pareja',
      entidad: 'pareja',
      entidadId: parejaId,
      antes: { estado: 'pendiente' },
      despues: { estado: 'rechazada', motivo },
    });
  });
}

export async function retirarPareja(parejaId: string, motivo: string, actor: Actor): Promise<void> {
  validarUuid(parejaId, 'pareja');
  motivo = limpiarTexto(motivo);
  if (motivo.length < 5) throw badRequest('El motivo debe tener al menos 5 caracteres');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{ id: string; estado: string; categoria_id: number; posicion: number | null }>(
      "SELECT id, estado, categoria_id, posicion FROM parejas WHERE id = $1 FOR UPDATE",
      [parejaId],
    );
    const pareja = r.rows[0];
    if (!pareja) throw notFound('Pareja no encontrada');
    if (pareja.estado !== 'aprobada') throw conflict(`Solo se puede retirar una pareja aprobada (actual: "${pareja.estado}")`);

    await tx.query("SET CONSTRAINTS parejas_posicion_unica DEFERRED");

    // Quitar posición
    await tx.query(
      `UPDATE parejas SET estado = 'retirada', posicion = NULL, motivo_cierre = $2, retirada_en = now() WHERE id = $1`,
      [parejaId, motivo],
    );
    await tx.query(`UPDATE jugadores SET activo = false WHERE pareja_id = $1`, [parejaId]);

    // Renumerar posiciones (cerrar huecos)
    if (pareja.posicion != null) {
      await renumerarPosiciones(tx, pareja.categoria_id);
    }

    await tx.audit({
      accion: 'retirar_pareja',
      entidad: 'pareja',
      entidadId: parejaId,
      antes: { estado: 'aprobada', posicion: pareja.posicion },
      despues: { estado: 'retirada', motivo },
    });
  });
}

/** Renumera las posiciones de una categoría para que sean 1, 2, 3, … sin huecos. */
async function renumerarPosiciones(tx: Tx, categoriaId: number): Promise<void> {
  await tx.query("SET CONSTRAINTS parejas_posicion_unica DEFERRED");
  const r = await tx.query<{ id: string }>(
    `SELECT id FROM parejas WHERE categoria_id = $1 AND estado = 'aprobada' AND posicion IS NOT NULL ORDER BY posicion`,
    [categoriaId],
  );
  let pos = 0;
  for (const row of r.rows) {
    pos++;
    if (pos > MAX_LOOP) throw new Error('Demasiadas parejas al renumerar posiciones');
    await tx.query(`UPDATE parejas SET posicion = $2 WHERE id = $1`, [row.id, pos]);
  }
}

export async function editarPareja(
  parejaId: string,
  data: {
    telefonoContacto: string;
    jugador1: { nombre: string; genero: string; telefono?: string };
    jugador2: { nombre: string; genero: string; telefono?: string };
  },
  actor: Actor,
): Promise<void> {
  validarUuid(parejaId, 'pareja');

  await withAdminTx(actor, async (tx) => {
    const parejaR = await tx.query<{ id: string; telefono_contacto: string; categoria_id: number }>(
      "SELECT id, telefono_contacto, categoria_id FROM parejas WHERE id = $1 FOR UPDATE",
      [parejaId],
    );
    if (!parejaR.rows[0]) throw notFound('Pareja no encontrada');
    const antes = parejaR.rows[0];

    const jugR = await tx.query<{ id: string; nombre: string; genero: string; telefono: string | null }>(
      `SELECT id, nombre, genero, telefono FROM jugadores WHERE pareja_id = $1 ORDER BY creado_en`,
      [parejaId],
    );
    if (jugR.rows.length !== 2) throw notFound('No se encontraron los 2 jugadores de la pareja');

    const mixta = data.jugador1.genero !== data.jugador2.genero;

    await tx.query(
      `UPDATE parejas SET telefono_contacto = $2, mixta = $3 WHERE id = $1`,
      [parejaId, data.telefonoContacto, mixta],
    );

    const updateJugador = async (
      jugadorId: string,
      j: { nombre: string; genero: string; telefono?: string },
    ) => {
      const clave = claveJugador(j.nombre);
      if (clave.length < 3) throw badRequest('El nombre es demasiado corto');
      try {
        await tx.query(
          `UPDATE jugadores SET nombre = $2, clave = $3, genero = $4, telefono = $5 WHERE id = $1`,
          [jugadorId, limpiarTexto(j.nombre), clave, j.genero, j.telefono || null],
        );
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === '23505') {
          throw conflict(`${limpiarTexto(j.nombre)} ya está inscrito/a en otra pareja activa`);
        }
        throw err;
      }
    };

    await updateJugador(jugR.rows[0].id, data.jugador1);
    await updateJugador(jugR.rows[1].id, data.jugador2);

    await tx.audit({
      accion: 'editar_pareja',
      entidad: 'pareja',
      entidadId: parejaId,
      antes: { telefono: antes.telefono_contacto, j1: jugR.rows[0].nombre, j2: jugR.rows[1].nombre },
      despues: { telefono: data.telefonoContacto, j1: data.jugador1.nombre, j2: data.jugador2.nombre },
    });
  });
}

export async function eliminarPareja(parejaId: string, motivo: string, actor: Actor): Promise<void> {
  validarUuid(parejaId, 'pareja');
  motivo = limpiarTexto(motivo);
  if (motivo.length < 5) throw badRequest('El motivo debe tener al menos 5 caracteres');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{
      id: string; estado: string; es_demo: boolean; categoria_id: number;
      posicion: number | null; telefono_contacto: string;
    }>(
      "SELECT id, estado, es_demo, categoria_id, posicion, telefono_contacto FROM parejas WHERE id = $1 FOR UPDATE",
      [parejaId],
    );
    const pareja = r.rows[0];
    if (!pareja) throw notFound('Pareja no encontrada');
    if (pareja.estado !== 'pendiente' && !pareja.es_demo) {
      throw forbidden('Solo se pueden eliminar parejas pendientes o de demostración. Usa retirar para parejas aprobadas.');
    }

    // Capturar datos de jugadores antes de borrar
    const jugR = await tx.query<{ nombre: string; clave: string }>(
      `SELECT nombre, clave FROM jugadores WHERE pareja_id = $1`,
      [parejaId],
    );

    await tx.query("SET CONSTRAINTS parejas_posicion_unica DEFERRED");

    // DELETE CASCADE borra jugadores también
    await tx.query(`DELETE FROM parejas WHERE id = $1`, [parejaId]);

    // Renumerar si tenía posición
    if (pareja.posicion != null) {
      await renumerarPosiciones(tx, pareja.categoria_id);
    }

    await tx.audit({
      accion: 'eliminar_pareja',
      entidad: 'pareja',
      entidadId: parejaId,
      antes: {
        estado: pareja.estado,
        es_demo: pareja.es_demo,
        jugadores: jugR.rows.map((j) => j.nombre),
      },
      detalle: motivo,
    });
  });
}

// ---------------------------------------------------------------------------
// Sorteo
// ---------------------------------------------------------------------------

export async function realizarSorteo(categoriaId: number, actor: Actor): Promise<string[]> {
  if (!Number.isInteger(categoriaId) || categoriaId < 1 || categoriaId > 6) {
    throw badRequest('Categoría no válida');
  }

  return withAdminTx(actor, async (tx) => {
    // Verificar categoría
    const catR = await tx.query<{ id: number; sorteo_realizado: boolean; nombre: string }>(
      "SELECT id, sorteo_realizado, nombre FROM categorias WHERE id = $1 FOR UPDATE",
      [categoriaId],
    );
    const cat = catR.rows[0];
    if (!cat) throw notFound('Categoría no encontrada');
    if (cat.sorteo_realizado) throw conflict('El sorteo ya fue realizado para esta categoría');

    // Obtener parejas aprobadas sin posición
    const parejasR = await tx.query<{ id: string }>(
      `SELECT id FROM parejas WHERE categoria_id = $1 AND estado = 'aprobada' AND posicion IS NULL ORDER BY creada_en`,
      [categoriaId],
    );
    if (parejasR.rows.length === 0) throw badRequest('No hay parejas aprobadas para sortear');

    // Fisher-Yates con crypto.randomInt
    const ids = parejasR.rows.map((r) => r.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    await tx.query("SET CONSTRAINTS parejas_posicion_unica DEFERRED");

    // Obtener posición máxima existente (para agregar después de las ya posicionadas)
    const maxR = await tx.query<{ maxp: number | null }>(
      `SELECT MAX(posicion) AS maxp FROM parejas WHERE categoria_id = $1 AND estado = 'aprobada'`,
      [categoriaId],
    );
    let pos = maxR.rows[0]?.maxp ?? 0;

    for (let i = 0; i < ids.length; i++) {
      if (i >= MAX_LOOP) throw new Error('Demasiadas parejas en el sorteo');
      pos++;
      await tx.query(`UPDATE parejas SET posicion = $2 WHERE id = $1`, [ids[i], pos]);
    }

    await tx.query(
      `UPDATE categorias SET sorteo_realizado = true, sorteo_en = now() WHERE id = $1`,
      [categoriaId],
    );

    await tx.audit({
      accion: 'sorteo',
      entidad: 'categoria',
      entidadId: String(categoriaId),
      despues: { categoria: cat.nombre, orden: ids },
    });

    return ids;
  });
}

// ---------------------------------------------------------------------------
// Partidos
// ---------------------------------------------------------------------------

export interface PartidoCreado {
  partidoId: string;
  retadaId: string;
}

export async function crearPartido(
  data: {
    tipo: 'reto' | 'ascenso';
    retadoraId: string;
    jornadaId: number;
    fechaJuego?: string;
    cancha?: number;
  },
  actor: Actor,
): Promise<PartidoCreado> {
  validarUuid(data.retadoraId, 'retadora');
  if (!Number.isInteger(data.jornadaId) || data.jornadaId < 1) throw badRequest('Jornada no válida');
  if (data.cancha != null && (!Number.isInteger(data.cancha) || data.cancha < 1 || data.cancha > 12)) {
    throw badRequest('Cancha no válida (1-12)');
  }

  return withAdminTx(actor, async (tx) => {
    // Verificar jornada
    const jornadaR = await tx.query<{ id: number; estado: string }>(
      "SELECT id, estado FROM jornadas WHERE id = $1",
      [data.jornadaId],
    );
    if (!jornadaR.rows[0]) throw notFound('Jornada no encontrada');
    if (jornadaR.rows[0].estado !== 'programada') throw conflict('La jornada ya está cerrada');

    // Obtener retadora
    const retadoraR = await tx.query<{
      id: string; categoria_id: number; posicion: number | null; estado: string;
    }>(
      "SELECT id, categoria_id, posicion, estado FROM parejas WHERE id = $1",
      [data.retadoraId],
    );
    const retadora = retadoraR.rows[0];
    if (!retadora) throw notFound('Pareja retadora no encontrada');
    if (retadora.estado !== 'aprobada') throw badRequest('La pareja retadora debe estar aprobada');
    if (retadora.posicion == null) throw badRequest('La pareja retadora no tiene posición asignada');

    let retadaId: string;
    let categoriaRetadaId: number;
    let posRetada: number;

    if (data.tipo === 'reto') {
      // Buscar la pareja inmediatamente arriba en la misma categoría
      const retadaR = await tx.query<{ id: string; categoria_id: number; posicion: number }>(
        `SELECT id, categoria_id, posicion FROM parejas
         WHERE categoria_id = $1 AND estado = 'aprobada' AND posicion = $2`,
        [retadora.categoria_id, retadora.posicion - 1],
      );
      if (!retadaR.rows[0]) throw badRequest('No hay pareja a quién retar (la retadora ya es 1er lugar o no hay posición arriba)');
      retadaId = retadaR.rows[0].id;
      categoriaRetadaId = retadaR.rows[0].categoria_id;
      posRetada = retadaR.rows[0].posicion;
    } else {
      // Ascenso: retadora debe ser pos 1 en su categoría
      if (retadora.posicion !== 1) throw badRequest('Solo el 1er lugar puede solicitar un partido de ascenso');

      // Buscar categoría superior
      const supR = await tx.query<{ superior_id: number | null }>(
        `SELECT superior_id FROM categorias WHERE id = $1`,
        [retadora.categoria_id],
      );
      const superiorId = supR.rows[0]?.superior_id;
      if (superiorId == null) throw badRequest('Esta categoría no tiene categoría superior para ascenso');

      // Último lugar de la categoría superior
      const retadaR = await tx.query<{ id: string; posicion: number }>(
        `SELECT id, posicion FROM parejas
         WHERE categoria_id = $1 AND estado = 'aprobada' AND posicion IS NOT NULL
         ORDER BY posicion DESC LIMIT 1`,
        [superiorId],
      );
      if (!retadaR.rows[0]) throw badRequest('No hay parejas en la categoría superior');
      retadaId = retadaR.rows[0].id;
      categoriaRetadaId = superiorId;
      posRetada = retadaR.rows[0].posicion;
    }

    // Un solo partido por semana por pareja: ninguna de las dos (retadora ni retada) puede
    // ya estar comprometida en otro partido (como retadora o como retada) de esta jornada.
    const conflictoR = await tx.query<{ id: string }>(
      `SELECT id FROM partidos
       WHERE jornada_id = $1 AND estado <> 'cancelado'
         AND (retadora_id = $2 OR retada_id = $2 OR retadora_id = $3 OR retada_id = $3)`,
      [data.jornadaId, data.retadoraId, retadaId],
    );
    if (conflictoR.rows.length > 0) {
      throw conflict('Una de las dos parejas ya tiene un partido programado esta semana (solo se permite un partido por semana por pareja)');
    }

    // Fecha de juego
    let fechaJuego: Date | null = null;
    if (data.fechaJuego) {
      fechaJuego = new Date(data.fechaJuego + ':00Z');
      if (isNaN(fechaJuego.getTime())) throw badRequest('Fecha y hora no válidas');
    }

    try {
      const partidoR = await tx.query<{ id: string }>(
        `INSERT INTO partidos (jornada_id, tipo, retadora_id, retada_id, categoria_retadora_id, categoria_retada_id, pos_retadora, pos_retada, fecha_juego, cancha)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          data.jornadaId,
          data.tipo,
          data.retadoraId,
          retadaId,
          retadora.categoria_id,
          categoriaRetadaId,
          retadora.posicion,
          posRetada,
          fechaJuego,
          data.cancha ?? null,
        ],
      );

      await tx.audit({
        accion: 'crear_partido',
        entidad: 'partido',
        entidadId: partidoR.rows[0].id,
        despues: {
          tipo: data.tipo,
          retadoraId: data.retadoraId,
          retadaId,
          jornadaId: data.jornadaId,
        },
      });

      return { partidoId: partidoR.rows[0].id, retadaId };
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') throw conflict('Ya existe un partido de esta pareja en esta jornada');
      throw err;
    }
  });
}

export async function programarPartido(
  partidoId: string,
  data: { fechaJuego?: string; cancha?: number },
  actor: Actor,
): Promise<void> {
  validarUuid(partidoId, 'partido');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{ id: string; estado: string; fecha_juego: string | null; cancha: number | null }>(
      "SELECT id, estado, fecha_juego, cancha FROM partidos WHERE id = $1 FOR UPDATE",
      [partidoId],
    );
    const partido = r.rows[0];
    if (!partido) throw notFound('Partido no encontrado');
    if (partido.estado !== 'programado') throw conflict('Solo se puede programar un partido que esté en estado "programado"');

    let fechaJuego: Date | null = null;
    if (data.fechaJuego) {
      fechaJuego = new Date(data.fechaJuego + ':00Z');
      if (isNaN(fechaJuego.getTime())) throw badRequest('Fecha y hora no válidas');
    }

    await tx.query(
      `UPDATE partidos SET fecha_juego = COALESCE($2, fecha_juego), cancha = COALESCE($3, cancha) WHERE id = $1`,
      [partidoId, fechaJuego, data.cancha ?? null],
    );

    await tx.audit({
      accion: 'programar_partido',
      entidad: 'partido',
      entidadId: partidoId,
      antes: { fecha_juego: partido.fecha_juego, cancha: partido.cancha },
      despues: { fecha_juego: data.fechaJuego ?? partido.fecha_juego, cancha: data.cancha ?? partido.cancha },
    });
  });
}

export async function cancelarPartido(partidoId: string, motivo: string, actor: Actor): Promise<void> {
  validarUuid(partidoId, 'partido');
  motivo = limpiarTexto(motivo);
  if (motivo.length < 5) throw badRequest('El motivo debe tener al menos 5 caracteres');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{ id: string; estado: string }>(
      "SELECT id, estado FROM partidos WHERE id = $1 FOR UPDATE",
      [partidoId],
    );
    const partido = r.rows[0];
    if (!partido) throw notFound('Partido no encontrado');
    if (partido.estado !== 'programado') throw conflict('Solo se puede cancelar un partido programado');

    await tx.query(
      `UPDATE partidos SET estado = 'cancelado', nota = $2 WHERE id = $1`,
      [partidoId, motivo],
    );

    await tx.audit({
      accion: 'cancelar_partido',
      entidad: 'partido',
      entidadId: partidoId,
      antes: { estado: 'programado' },
      despues: { estado: 'cancelado', motivo },
    });
  });
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export async function registrarResultado(
  partidoId: string,
  sets: { a: number; b: number }[],
  actor: Actor,
): Promise<{ ganadoraId: string }> {
  validarUuid(partidoId, 'partido');

  const resultado = evaluarMarcador(sets);
  if (!resultado.ok) throw badRequest(resultado.error);

  return withAdminTx(actor, async (tx) => {
    const r = await tx.query<{
      id: string; estado: string; retadora_id: string; retada_id: string;
    }>(
      "SELECT id, estado, retadora_id, retada_id FROM partidos WHERE id = $1 FOR UPDATE",
      [partidoId],
    );
    const partido = r.rows[0];
    if (!partido) throw notFound('Partido no encontrado');
    if (partido.estado !== 'programado') throw conflict(`El partido no está en estado "programado" (actual: "${partido.estado}")`);

    const ganadoraId = resultado.ganadora === 'a' ? partido.retadora_id : partido.retada_id;

    await tx.query(
      `UPDATE partidos SET estado = 'jugado', sets = $2::jsonb, ganadora_id = $3, jugado_en = now() WHERE id = $1`,
      [partidoId, JSON.stringify(sets), ganadoraId],
    );

    await tx.audit({
      accion: 'registrar_resultado',
      entidad: 'partido',
      entidadId: partidoId,
      despues: { sets, ganadora: resultado.ganadora, ganadoraId },
    });

    return { ganadoraId };
  });
}

export async function resolverPorClub(
  partidoId: string,
  ganadoraId: string,
  nota: string,
  actor: Actor,
): Promise<void> {
  validarUuid(partidoId, 'partido');
  validarUuid(ganadoraId, 'ganadora');
  nota = limpiarTexto(nota);
  if (nota.length < 10) throw badRequest('La nota de la resolución debe tener al menos 10 caracteres');

  await withAdminTx(actor, async (tx) => {
    const r = await tx.query<{
      id: string; estado: string; retadora_id: string; retada_id: string;
    }>(
      "SELECT id, estado, retadora_id, retada_id FROM partidos WHERE id = $1 FOR UPDATE",
      [partidoId],
    );
    const partido = r.rows[0];
    if (!partido) throw notFound('Partido no encontrado');
    if (partido.estado !== 'programado') throw conflict('Solo se puede resolver un partido programado');
    if (ganadoraId !== partido.retadora_id && ganadoraId !== partido.retada_id) {
      throw badRequest('La ganadora debe ser una de las dos parejas del partido');
    }

    await tx.query(
      `UPDATE partidos SET estado = 'resuelto_club', ganadora_id = $2, nota = $3, jugado_en = now() WHERE id = $1`,
      [partidoId, ganadoraId, nota],
    );

    await tx.audit({
      accion: 'resolver_por_club',
      entidad: 'partido',
      entidadId: partidoId,
      despues: { ganadoraId, nota },
    });
  });
}

// ---------------------------------------------------------------------------
// Cierre de jornada
// ---------------------------------------------------------------------------

export async function cerrarJornada(jornadaId: number, actor: Actor): Promise<void> {
  if (!Number.isInteger(jornadaId) || jornadaId < 1) throw badRequest('Jornada no válida');

  await withAdminTx(actor, async (tx) => {
    // 1. Lock y verificar jornada
    const jornadaR = await tx.query<{ id: number; estado: string; tipo: string; numero: number | null }>(
      "SELECT id, estado, tipo, numero FROM jornadas WHERE id = $1 FOR UPDATE",
      [jornadaId],
    );
    const jornada = jornadaR.rows[0];
    if (!jornada) throw notFound('Jornada no encontrada');
    if (jornada.estado !== 'programada') throw conflict('La jornada ya está cerrada');

    // 2. Configuración
    const cfg = await configVals(tx, ['eximir_primer_lugar']);
    const eximirPrimerLugar = cfg.get('eximir_primer_lugar') === 'true';

    // 3. Obtener todas las categorías con parejas aprobadas
    const categoriasR = await tx.query<{ id: number; superior_id: number | null; nombre: string }>(
      `SELECT id, superior_id, nombre FROM categorias ORDER BY orden`,
    );

    // 4. Obtener todas las parejas aprobadas con posición, agrupadas por categoría
    const parejasR = await tx.query<{ id: string; categoria_id: number; posicion: number }>(
      `SELECT id, categoria_id, posicion FROM parejas WHERE estado = 'aprobada' AND posicion IS NOT NULL ORDER BY posicion`,
    );
    const parejaPorCat = new Map<number, { id: string; posicion: number }[]>();
    for (const p of parejasR.rows) {
      const arr = parejaPorCat.get(p.categoria_id) ?? [];
      arr.push({ id: p.id, posicion: p.posicion });
      parejaPorCat.set(p.categoria_id, arr);
    }

    // 5. Obtener partidos resueltos de esta jornada
    const partidosR = await tx.query<{
      id: string; tipo: string; retadora_id: string; retada_id: string;
      categoria_retadora_id: number; categoria_retada_id: number; ganadora_id: string;
    }>(
      `SELECT id, tipo, retadora_id, retada_id, categoria_retadora_id, categoria_retada_id, ganadora_id
       FROM partidos WHERE jornada_id = $1 AND estado IN ('jugado', 'resuelto_club')`,
      [jornadaId],
    );

    // Partidos de reto por categoría
    const retosPorCat = new Map<number, RetoResuelto[]>();
    const ascensos: AscensoResuelto[] = [];
    const jugaron = new Set<string>();

    for (const p of partidosR.rows) {
      jugaron.add(p.retadora_id);
      jugaron.add(p.retada_id);

      if (p.tipo === 'reto') {
        const arr = retosPorCat.get(p.categoria_retadora_id) ?? [];
        arr.push({
          retadoraId: p.retadora_id,
          retadaId: p.retada_id,
          ganadoraId: p.ganadora_id,
        });
        retosPorCat.set(p.categoria_retadora_id, arr);
      } else if (p.tipo === 'ascenso') {
        ascensos.push({
          categoriaInferiorId: p.categoria_retadora_id,
          categoriaSuperiorId: p.categoria_retada_id,
          retadoraId: p.retadora_id,
          retadaId: p.retada_id,
          ganadoraId: p.ganadora_id,
        });
      }
    }

    // 6. Aplicar motor del ranking por categoría
    await tx.query("SET CONSTRAINTS parejas_posicion_unica DEFERRED");

    const ordenesNuevos = new Map<number, string[]>();
    const motivosPorPareja = new Map<string, string>();
    let catIter = 0;

    for (const cat of categoriasR.rows) {
      catIter++;
      if (catIter > 20) throw new Error('Demasiadas categorías');

      const parejas = parejaPorCat.get(cat.id);
      if (!parejas || parejas.length === 0) continue;

      const orden = parejas.map((p) => p.id);
      const retos = retosPorCat.get(cat.id) ?? [];

      // Construir el set de jugaron para esta categoría
      const jugaronCat = new Set<string>();
      for (const id of orden) {
        if (jugaron.has(id)) jugaronCat.add(id);
      }

      const resultado = aplicarSemana({
        orden,
        retos,
        jugaron: jugaronCat,
        eximirPrimerLugar,
      });

      ordenesNuevos.set(cat.id, resultado.orden);
      for (const [id, motivo] of resultado.motivos) {
        motivosPorPareja.set(id, motivo);
      }
    }

    // 7. Aplicar ascensos
    let ordenesFinales: Map<number, string[]> = new Map(ordenesNuevos);
    let ascIter = 0;
    for (const asc of ascensos) {
      ascIter++;
      if (ascIter > 10) throw new Error('Demasiados ascensos en una jornada');

      try {
        const readOnlyMap = new Map<number, readonly string[]>(ordenesFinales);
        ordenesFinales = aplicarAscenso(readOnlyMap, asc);
        motivosPorPareja.set(asc.retadoraId, asc.ganadoraId === asc.retadoraId ? 'victoria' : 'derrota');
        motivosPorPareja.set(asc.retadaId, asc.ganadoraId === asc.retadoraId ? 'derrota' : 'sin_cambio');
      } catch (err) {
        log.warn('ascenso_ignorado', { error: serializeError(err), ascenso: asc });
      }
    }

    // 8. Actualizar posiciones en la base de datos e insertar movimientos
    let updateIter = 0;
    for (const [catId, orden] of ordenesFinales) {
      for (let i = 0; i < orden.length; i++) {
        updateIter++;
        if (updateIter > MAX_LOOP * 2) throw new Error('Demasiadas actualizaciones de posición');

        const parejaId = orden[i];
        const posNueva = i + 1;

        // Obtener categoría y posición actuales
        const origPareja = parejasR.rows.find((p) => p.id === parejaId);
        const catAntes = origPareja?.categoria_id ?? catId;
        const posAntes = origPareja?.posicion ?? posNueva;

        // Actualizar posición y categoría (en caso de ascenso)
        await tx.query(
          `UPDATE parejas SET posicion = $2, categoria_id = $3 WHERE id = $1`,
          [parejaId, posNueva, catId],
        );

        // Insertar movimiento
        const motivo = motivosPorPareja.get(parejaId) ?? 'sin_cambio';
        await tx.query(
          `INSERT INTO movimientos (jornada_id, pareja_id, categoria_antes, pos_antes, categoria_despues, pos_despues, motivo)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [jornadaId, parejaId, catAntes, posAntes, catId, posNueva, motivo],
        );
      }
    }

    // 9. Marcar partidos no jugados
    await tx.query(
      `UPDATE partidos SET estado = 'no_jugado' WHERE jornada_id = $1 AND estado = 'programado'`,
      [jornadaId],
    );

    // 10. Cerrar jornada
    await tx.query(
      `UPDATE jornadas SET estado = 'cerrada', cerrada_en = now() WHERE id = $1`,
      [jornadaId],
    );

    await tx.audit({
      accion: 'cerrar_jornada',
      entidad: 'jornada',
      entidadId: String(jornadaId),
      despues: {
        numero: jornada.numero,
        categorias_procesadas: [...ordenesFinales.keys()],
        partidos_resueltos: partidosR.rows.length,
        ascensos: ascensos.length,
      },
    });
  });
}

export async function cerrarJornadasVencidas(actor: Actor): Promise<number> {
  // Buscar jornadas vencidas FUERA de la transacción (cada cierre es su propia tx)
  const r = await query<{ id: number }>(
    `SELECT id FROM jornadas
     WHERE estado = 'programada' AND tipo = 'normal' AND cierre < now()
     ORDER BY inicio
     LIMIT 10`,
  );

  let cerradas = 0;
  for (const row of r.rows) {
    if (cerradas >= 10) break;
    try {
      await cerrarJornada(row.id, actor);
      cerradas++;
      log.info('jornada_cerrada_por_cron', { jornadaId: row.id });
    } catch (err) {
      log.error('error_cerrando_jornada', { jornadaId: row.id, error: serializeError(err) });
      // Continúa con las siguientes: un fallo no debe bloquear las demás
    }
  }

  return cerradas;
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const CLAVES_QUE_REGENERAN_JORNADAS = new Set([
  'inicio_ranking', 'fin_ranking', 'pausa_inicio', 'pausa_fin', 'zona_horaria',
]);

export async function actualizarConfig(clave: string, valor: string, actor: Actor): Promise<void> {
  const def = CONFIG_DEFS[clave];
  if (!def) throw badRequest('Configuración desconocida');

  valor = limpiarTexto(valor);
  const errorValidacion = def.validar(valor);
  if (errorValidacion) throw badRequest(errorValidacion);

  await withAdminTx(actor, async (tx) => {
    const antesR = await tx.query<{ valor: string }>(
      "SELECT valor FROM configuracion WHERE clave = $1 FOR UPDATE",
      [clave],
    );
    const antes = antesR.rows[0]?.valor ?? null;

    await tx.query(
      `UPDATE configuracion SET valor = $2, actualizado_en = now() WHERE clave = $1`,
      [clave, valor],
    );

    // Regenerar jornadas si cambiaron las fechas del ranking
    if (CLAVES_QUE_REGENERAN_JORNADAS.has(clave)) {
      try {
        await tx.query(`SELECT generar_jornadas()`);
      } catch (err) {
        log.error('error_generando_jornadas', { error: serializeError(err) });
        throw badRequest(`Error al regenerar las jornadas: ${(err as Error).message}`);
      }
    }

    await tx.audit({
      accion: 'actualizar_config',
      entidad: 'configuracion',
      entidadId: clave,
      antes: { valor: antes },
      despues: { valor },
      detalle: def.etiqueta,
    });
  });
}
