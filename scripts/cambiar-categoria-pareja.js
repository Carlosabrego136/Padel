/**
 * Cambia la categoría de una pareja YA REGISTRADA (sin tocar su estado, sin crear ninguna baja ni
 * registro de retirada). Pensado para el caso de "me equivoqué de categoría, cámbiala" ANTES de
 * que se haga el sorteo de esa categoría (si ya tiene posición asignada, el script se detiene por
 * seguridad y no hace nada).
 *
 * Uso: node scripts/cambiar-categoria-pareja.js "<nombre de un jugador de la pareja>" "<categoria destino>"
 * Ejemplo: node scripts/cambiar-categoria-pareja.js "mariana" "sexta"
 *
 * La categoría destino puede ser el slug (libre, tercera, cuarta, quinta, sexta, femenil) o una
 * parte del nombre (ej. "sexta", "femenil").
 */

const dotenv = require('dotenv');
const fs = require('fs');
for (const f of ['.env.local', '.env']) {
  if (fs.existsSync(f)) dotenv.config({ path: f });
}
const { Client } = require('pg');

async function main() {
  const [busqueda, categoriaDestino] = process.argv.slice(2);
  if (!busqueda || !categoriaDestino) {
    console.error('Uso: node scripts/cambiar-categoria-pareja.js "<nombre jugador>" "<categoria destino>"');
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
    // 1) Encontrar la pareja (no retirada ni rechazada) a partir del nombre de un jugador.
    const candidatos = await client.query(
      `SELECT DISTINCT p.id, p.estado, p.posicion, p.categoria_id, c.nombre AS categoria
       FROM jugadores j
       JOIN parejas p ON p.id = j.pareja_id
       JOIN categorias c ON c.id = p.categoria_id
       WHERE j.nombre ILIKE $1 AND p.estado NOT IN ('retirada', 'rechazada')`,
      [`%${busqueda}%`],
    );

    if (candidatos.rows.length === 0) {
      console.log(`No encontré ninguna pareja activa (aprobada/pendiente) con un jugador que coincida con "${busqueda}".`);
      return;
    }
    if (candidatos.rows.length > 1) {
      console.log(`Encontré ${candidatos.rows.length} parejas distintas que coinciden con "${busqueda}". Sé más específico:`);
      for (const c of candidatos.rows) {
        console.log(`  - pareja ${c.id} | categoría actual: ${c.categoria} | estado: ${c.estado}`);
      }
      return;
    }

    const pareja = candidatos.rows[0];

    const jugadoresR = await client.query(
      `SELECT nombre FROM jugadores WHERE pareja_id = $1 ORDER BY creado_en`,
      [pareja.id],
    );
    const nombres = jugadoresR.rows.map((r) => r.nombre).join(' / ');

    console.log(`\nPareja encontrada: ${nombres}`);
    console.log(`  Categoría actual: ${pareja.categoria} | estado: ${pareja.estado} | posición: ${pareja.posicion ?? '(sin asignar)'}`);

    // 2) Verificación de seguridad: si ya tiene posición (ya se hizo el sorteo de su categoría),
    // no se puede simplemente reasignar la categoría sin más — se detiene aquí.
    if (pareja.posicion !== null) {
      console.log(
        '\nESTA PAREJA YA TIENE POSICIÓN ASIGNADA (ya se hizo el sorteo de su categoría actual). ' +
          'Por seguridad este script NO hace ningún cambio. Avísale a Claude antes de continuar.',
      );
      return;
    }

    // 3) Encontrar la categoría destino (por slug o por nombre parcial).
    const catDestinoR = await client.query(
      `SELECT id, nombre FROM categorias WHERE slug = $1 OR nombre ILIKE $2`,
      [categoriaDestino.toLowerCase(), `%${categoriaDestino}%`],
    );
    if (catDestinoR.rows.length === 0) {
      console.log(`No encontré ninguna categoría que coincida con "${categoriaDestino}".`);
      return;
    }
    if (catDestinoR.rows.length > 1) {
      console.log(`"${categoriaDestino}" coincide con varias categorías, sé más específico:`);
      for (const c of catDestinoR.rows) console.log(`  - ${c.nombre}`);
      return;
    }
    const catDestino = catDestinoR.rows[0];

    if (catDestino.id === pareja.categoria_id) {
      console.log(`Esta pareja ya está en "${catDestino.nombre}". No hay nada que cambiar.`);
      return;
    }

    // 4) Aplicar el cambio: solo se actualiza categoria_id, nada más (mismo estado, mismo
    // historial, no se crea ninguna baja).
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.actor', 'script:cambiar-categoria-pareja', true)");

    const update = await client.query(
      `UPDATE parejas SET categoria_id = $1 WHERE id = $2 AND categoria_id = $3`,
      [catDestino.id, pareja.id, pareja.categoria_id],
    );
    if (update.rowCount !== 1) {
      await client.query('ROLLBACK');
      console.log('No se pudo aplicar el cambio (la pareja cambió entre la lectura y la escritura). No se hizo nada, inténtalo de nuevo.');
      return;
    }

    await client.query('COMMIT');
    console.log(`\nListo: ${nombres} quedó movida de "${pareja.categoria}" a "${catDestino.nombre}". Sigue aprobada, sin ninguna baja.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
