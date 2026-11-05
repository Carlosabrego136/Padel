/**
 * Borra por completo una o más parejas, SOLO si su estado sigue siendo 'retirada' (verificación
 * de seguridad: nunca borra una pareja pendiente, aprobada o rechazada, aunque se le pase su id
 * por error). Al borrar la pareja, sus jugadores y su historial de movimientos se borran
 * automáticamente con ella (relación ON DELETE CASCADE ya definida en la base de datos).
 *
 * Antes de usar este script, confirma con scripts/verificar-dependencias-pareja.js que esa
 * pareja no tiene partidos ni referencias en campeones_temporada.
 *
 * Uso: node scripts/eliminar-parejas-retiradas.js <id1> [id2] [id3] ...
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
    console.error('Uso: node scripts/eliminar-parejas-retiradas.js <id1> [id2] ...');
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
    await client.query('BEGIN');
    // La base de datos exige saber "quién" hace cualquier DELETE/UPDATE sobre tablas críticas
    // (lo usa el trigger de auditoría para registrar en audit_cambios). Sin esto, el DELETE se
    // rechaza con "falta app.actor".
    await client.query("SELECT set_config('app.actor', 'script:eliminar-parejas-retiradas', true)");

    for (const id of ids) {
      const check = await client.query(`SELECT estado FROM parejas WHERE id = $1`, [id]);
      if (check.rows.length === 0) {
        throw new Error(`No existe ninguna pareja con id ${id}. Cancelando todo, no se borró nada.`);
      }
      if (check.rows[0].estado !== 'retirada') {
        throw new Error(
          `La pareja ${id} tiene estado "${check.rows[0].estado}", NO "retirada". Por seguridad no se borra nada. Cancelando todo.`,
        );
      }
    }

    for (const id of ids) {
      const r = await client.query(`DELETE FROM parejas WHERE id = $1`, [id]);
      console.log(`Pareja ${id}: borrada (${r.rowCount} fila).`);
    }

    await client.query('COMMIT');
    console.log('\nListo. Todas las parejas indicadas quedaron eliminadas junto con sus jugadores.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`\nNo se borró nada (se revirtió todo). Motivo: ${err.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
