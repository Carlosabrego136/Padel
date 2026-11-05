/**
 * Revisa, para una o más parejas (por su id), si tienen partidos jugados/programados o
 * registros en campeones_temporada que dependan de ellas. Sirve para confirmar que una pareja
 * retirada se puede borrar por completo sin romper nada (sin partidos ni historial de campeón
 * apuntando a ella).
 *
 * Uso: node scripts/verificar-dependencias-pareja.js <id1> [id2] [id3] ...
 * No modifica nada, solo lee.
 */

const dotenv = require('dotenv');
const fs = require('fs');
for (const f of ['.env.local', '.env']) {
  if (fs.existsSync(f)) dotenv.config({ path: f });
}
const { Client } = require('pg');

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('Uso: node scripts/verificar-dependencias-pareja.js <id1> [id2] ...');
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
    for (const id of ids) {
      console.log(`\n=== Pareja ${id} ===`);

      const partidos = await client.query(
        `SELECT id, tipo, estado, retadora_id, retada_id, ganadora_id
         FROM partidos
         WHERE retadora_id = $1 OR retada_id = $1 OR ganadora_id = $1`,
        [id],
      );
      if (partidos.rows.length === 0) {
        console.log('Partidos: ninguno (se puede borrar sin problema por este lado).');
      } else {
        console.log(`Partidos: ${partidos.rows.length} encontrado(s) — ESTO BLOQUEARÍA el borrado:`);
        for (const row of partidos.rows) {
          console.log(`  - id ${row.id} | tipo: ${row.tipo} | estado: ${row.estado}`);
        }
      }

      const campeones = await client.query(
        `SELECT id, categoria_id, temporada, usado FROM campeones_temporada WHERE pareja_id = $1 OR pareja_nueva_id = $1`,
        [id],
      );
      if (campeones.rows.length === 0) {
        console.log('Campeones_temporada: ninguna referencia.');
      } else {
        console.log(`Campeones_temporada: ${campeones.rows.length} referencia(s):`);
        for (const row of campeones.rows) {
          console.log(`  - id ${row.id} | categoría ${row.categoria_id} | temporada ${row.temporada} | usado: ${row.usado}`);
        }
      }

      const movimientos = await client.query(`SELECT count(*)::int AS n FROM movimientos WHERE pareja_id = $1`, [id]);
      console.log(`Movimientos (historial): ${movimientos.rows[0].n} registro(s) — se borran automáticamente junto con la pareja (no bloquean nada).`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
