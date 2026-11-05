/**
 * Busca un jugador por nombre (parcial, sin importar mayúsculas/acentos exactos) en TODAS las
 * parejas, sin importar su estado (pendiente, aprobada, rechazada, retirada) ni si el jugador
 * sigue activo. Sirve para ver en qué categoría(s) y con qué estado aparece alguien.
 *
 * Uso: node scripts/buscar-jugador.js "ezequiel"
 * Lee las credenciales de tu .env.local o .env. No modifica nada, solo lee.
 */

const dotenv = require('dotenv');
const fs = require('fs');
for (const f of ['.env.local', '.env']) {
  if (fs.existsSync(f)) dotenv.config({ path: f });
}
const { Client } = require('pg');

async function main() {
  const termino = process.argv[2];
  if (!termino) {
    console.error('Uso: node scripts/buscar-jugador.js "nombre o parte del nombre"');
    process.exit(1);
  }

  const { DATABASE_URL, DATABASE_CA } = process.env;
  if (!DATABASE_URL) {
    console.error('No encontré DATABASE_URL en .env.local ni .env.');
    process.exit(1);
  }

  const url = new URL(DATABASE_URL.replace(/^postgresql:/i, 'postgres:'));
  url.searchParams.delete('sslmode');
  const ssl = DATABASE_CA && DATABASE_CA.trim()
    ? { ca: DATABASE_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
    : { rejectUnauthorized: false };

  const client = new Client({ connectionString: url.toString(), ssl });
  await client.connect();

  try {
    const r = await client.query(
      `SELECT j.nombre AS jugador, j.activo, p.id AS pareja_id, p.estado, p.posicion, c.nombre AS categoria
       FROM jugadores j
       JOIN parejas p ON p.id = j.pareja_id
       JOIN categorias c ON c.id = p.categoria_id
       WHERE unaccent(j.nombre) ILIKE unaccent($1)
       ORDER BY j.nombre`,
      [`%${termino}%`],
    ).catch(async (err) => {
      // Si la extensión unaccent no está disponible, buscamos sin ella (sin ignorar acentos).
      if (err.code === '42883') {
        return client.query(
          `SELECT j.nombre AS jugador, j.activo, p.id AS pareja_id, p.estado, p.posicion, c.nombre AS categoria
           FROM jugadores j
           JOIN parejas p ON p.id = j.pareja_id
           JOIN categorias c ON c.id = p.categoria_id
           WHERE j.nombre ILIKE $1
           ORDER BY j.nombre`,
          [`%${termino}%`],
        );
      }
      throw err;
    });

    if (r.rows.length === 0) {
      console.log(`No encontré ningún jugador que coincida con "${termino}".`);
      return;
    }

    console.log(`\n${r.rows.length} resultado(s) para "${termino}":\n`);
    for (const row of r.rows) {
      console.log(
        `- ${row.jugador} | ${row.categoria} | estado: ${row.estado} | posición: ${row.posicion ?? '—'} | activo: ${row.activo} | pareja: ${row.pareja_id}`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
