#!/usr/bin/env node
/**
 * Pádel Life · Datos de demostración.
 * Crea parejas aprobadas (marcadas es_demo = true) en las 6 categorías y
 * realiza el sorteo inicial en cada una. No toca la configuración de
 * fechas/cuotas: esos valores ya quedan establecidos por db/schema.sql
 * (migrate.mjs) y aquí solo se leen para calcular la cuota de cada pareja.
 *
 * Uso: npm run db:seed
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const TIMEOUT_MS = 30_000;
const timer = setTimeout(() => {
  console.error('⛔ Tiempo límite de 30 s excedido.');
  process.exit(1);
}, TIMEOUT_MS);
timer.unref?.();

function buildPool() {
  const raw = process.env.DATABASE_URL;
  if (!raw) { console.error('⛔ Falta la variable DATABASE_URL'); process.exit(1); }
  const url = new URL(raw.replace(/^postgresql:/i, 'postgres:'));
  url.searchParams.delete('sslmode');
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const ssl = isLocal
    ? false
    : process.env.DATABASE_CA?.trim()
      ? { ca: process.env.DATABASE_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  return new pg.Pool({
    connectionString: url.toString(),
    ssl,
    max: 1,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 20_000,
  });
}

// [categoriaSlug, j1Nombre, j1Genero, j2Nombre, j2Genero, telContacto]
// Las 6 categorías del reglamento: libre, tercera, cuarta, quinta, sexta, femenil.
const DEMO_PAREJAS = [
  // Libre
  ['libre', 'Carlos Mendoza', 'M', 'Diego Rivera', 'M', '3111234501'],
  ['libre', 'Andrés López', 'M', 'Fernando Ruiz', 'M', '3111234502'],
  ['libre', 'Miguel Torres', 'M', 'Rafael Herrera', 'M', '3111234503'],
  ['libre', 'Patricio Vega', 'M', 'Hugo Castillo', 'M', '3111234504'],
  // Tercera fuerza
  ['tercera', 'Luis García', 'M', 'Martín Flores', 'M', '3111234505'],
  ['tercera', 'Jorge Ramírez', 'M', 'Pablo Moreno', 'M', '3111234506'],
  ['tercera', 'Sergio Jiménez', 'M', 'Daniel Cruz', 'M', '3111234507'],
  ['tercera', 'Tomás Ortiz', 'M', 'Iván Ramos', 'M', '3111234508'],
  // Cuarta fuerza
  ['cuarta', 'Pedro Martínez', 'M', 'Rubén Díaz', 'M', '3111234509'],
  ['cuarta', 'Oscar Vargas', 'M', 'Eduardo Peña', 'M', '3111234510'],
  ['cuarta', 'Raúl Aguilar', 'M', 'Manuel Castro', 'M', '3111234511'],
  ['cuarta', 'Alberto Soto', 'M', 'Francisco Lara', 'M', '3111234512'],
  // Quinta fuerza
  ['quinta', 'Gerardo Núñez', 'M', 'Ricardo Chávez', 'M', '3111234513'],
  ['quinta', 'Arturo Delgado', 'M', 'Vicente Guerrero', 'M', '3111234514'],
  ['quinta', 'Emilio Campos', 'M', 'Rodolfo Medina', 'M', '3111234515'],
  // Sexta fuerza
  ['sexta', 'Beto Salazar', 'M', 'Noel Fuentes', 'M', '3111234516'],
  ['sexta', 'Ismael Carrillo', 'M', 'Gustavo Pacheco', 'M', '3111234517'],
  ['sexta', 'Felipe Montes', 'M', 'Alonso Rangel', 'M', '3111234518'],
  // Femenil
  ['femenil', 'Ana Rodríguez', 'F', 'Sofía Hernández', 'F', '3111234519'],
  ['femenil', 'María Sánchez', 'F', 'Laura Gutiérrez', 'F', '3111234520'],
  ['femenil', 'Daniela Reyes', 'F', 'Valeria Muñoz', 'F', '3111234521'],
  ['femenil', 'Karla Espinoza', 'F', 'Paola Villarreal', 'F', '3111234522'],
];

function claveJugador(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const pool = buildPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.actor', 'script:seed-demo', true)");

    const existentes = await client.query('SELECT count(*)::int AS n FROM parejas');
    if (existentes.rows[0].n > 0) {
      console.warn('⚠️  Ya hay parejas en la base de datos. No se insertaron datos de demo.');
      await client.query('ROLLBACK');
      return;
    }

    const catR = await client.query('SELECT id, slug FROM categorias ORDER BY orden');
    const catMap = new Map(catR.rows.map((r) => [r.slug, r.id]));
    const slugsFaltantes = [...new Set(DEMO_PAREJAS.map((p) => p[0]))].filter((s) => !catMap.has(s));
    if (slugsFaltantes.length > 0) {
      throw new Error(`Categorías no encontradas en la base de datos: ${slugsFaltantes.join(', ')}`);
    }

    // Cuota vigente según configuración de fechas (fecha_limite_inscripcion / cuota_inicial / cuota_tardia).
    const cfgR = await client.query(
      "SELECT clave, valor FROM configuracion WHERE clave IN ('fecha_limite_inscripcion','cuota_inicial','cuota_tardia')",
    );
    const cfg = new Map(cfgR.rows.map((r) => [r.clave, r.valor]));
    const limite = cfg.get('fecha_limite_inscripcion') ?? '2099-12-31';
    const hoy = new Date().toISOString().slice(0, 10);
    const cuota = hoy <= limite
      ? parseInt(cfg.get('cuota_inicial') ?? '200', 10)
      : parseInt(cfg.get('cuota_tardia') ?? '300', 10);

    let creadas = 0;
    const categoriasConParejas = new Set();

    for (const [slug, j1n, j1g, j2n, j2g, tel] of DEMO_PAREJAS) {
      const catId = catMap.get(slug);
      const mixta = j1g !== j2g;

      const pR = await client.query(
        `INSERT INTO parejas
           (categoria_id, telefono_contacto, acepta_publicar, mixta, estado, pago_confirmado, aprobada_en, cuota_por_jugador, es_demo)
         VALUES ($1, $2, true, $3, 'aprobada', true, now(), $4, true)
         RETURNING id`,
        [catId, tel, mixta, cuota],
      );
      const parejaId = pR.rows[0].id;

      for (const [nombre, genero] of [[j1n, j1g], [j2n, j2g]]) {
        const clave = claveJugador(nombre);
        await client.query(
          `INSERT INTO jugadores (pareja_id, nombre, clave, genero) VALUES ($1, $2, $3, $4)`,
          [parejaId, nombre, clave, genero],
        );
      }

      categoriasConParejas.add(catId);
      creadas++;
    }

    // Sorteo inicial: posiciones aleatorias dentro de cada categoría con parejas.
    for (const catId of categoriasConParejas) {
      const pR = await client.query(
        `SELECT id FROM parejas WHERE categoria_id = $1 AND estado = 'aprobada' ORDER BY random()`,
        [catId],
      );
      let pos = 1;
      for (const row of pR.rows) {
        await client.query('UPDATE parejas SET posicion = $1 WHERE id = $2', [pos, row.id]);
        pos++;
      }
      await client.query(
        'UPDATE categorias SET sorteo_realizado = true, sorteo_en = now() WHERE id = $1',
        [catId],
      );
    }

    await client.query('COMMIT');
    console.log(
      `✅ ${creadas} parejas de demostración creadas (es_demo = true) con sorteo en ${categoriasConParejas.size} categorías. Cuota aplicada: $${cuota}.`,
    );
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* best effort */
    }
    console.error('⛔ Error:', err.message ?? err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    clearTimeout(timer);
  }
}

main();
