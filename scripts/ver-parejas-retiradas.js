/**
 * Muestra en la terminal todas las parejas marcadas como "retirada", con los nombres y
 * teléfonos de sus jugadores (sin el filtro de "activo" que usa el panel de admin, así que
 * aquí sí se ven aunque ya estén inactivos).
 *
 * Uso: node scripts/ver-parejas-retiradas.js
 * Lee las credenciales de tu archivo .env.local (DATABASE_URL y, si existe, DATABASE_CA).
 * No modifica nada, solo lee.
 */

const dotenv = require('dotenv');
const fs = require('fs');
// Admite .env.local o .env, lo que exista en la carpeta del proyecto.
for (const f of ['.env.local', '.env']) {
  if (fs.existsSync(f)) dotenv.config({ path: f });
}
const { Client } = require('pg');

async function main() {
  const { DATABASE_URL, DATABASE_CA } = process.env;
  if (!DATABASE_URL) {
    console.error('No encontré DATABASE_URL en .env.local. Corre este script desde la carpeta del proyecto.');
    process.exit(1);
  }

  // Igual que en src/lib/db.ts: quitamos sslmode de la URL (si no, pg exige verificar la
  // cadena de certificados contra las CA del sistema y truena con Aiven) y lo manejamos aparte.
  const url = new URL(DATABASE_URL.replace(/^postgresql:/i, 'postgres:'));
  url.searchParams.delete('sslmode');

  const ssl = DATABASE_CA && DATABASE_CA.trim()
    ? { ca: DATABASE_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
    : { rejectUnauthorized: false };

  const client = new Client({ connectionString: url.toString(), ssl });
  await client.connect();

  try {
    const r = await client.query(`
      SELECT p.id, p.telefono_contacto, p.retirada_en, p.motivo_cierre,
             c.nombre AS categoria, j.nombre AS jugador_nombre, j.telefono AS jugador_telefono
      FROM parejas p
      JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN jugadores j ON j.pareja_id = p.id
      WHERE p.estado = 'retirada'
      ORDER BY p.retirada_en DESC NULLS LAST, p.id, j.nombre
    `);

    if (r.rows.length === 0) {
      console.log('No hay parejas retiradas.');
      return;
    }

    const porPareja = new Map();
    for (const row of r.rows) {
      if (!porPareja.has(row.id)) {
        porPareja.set(row.id, {
          id: row.id,
          categoria: row.categoria,
          telefono_contacto: row.telefono_contacto,
          retirada_en: row.retirada_en,
          motivo: row.motivo_cierre,
          jugadores: [],
        });
      }
      if (row.jugador_nombre) {
        porPareja.get(row.id).jugadores.push(`${row.jugador_nombre} (${row.jugador_telefono ?? 'sin tel.'})`);
      }
    }

    console.log(`\n${porPareja.size} pareja(s) retirada(s):\n`);
    for (const p of porPareja.values()) {
      console.log(`- ${p.categoria} | Tel. contacto: ${p.telefono_contacto} | Retirada: ${p.retirada_en ? new Date(p.retirada_en).toLocaleString('es-MX') : '—'}`);
      console.log(`  Jugadores: ${p.jugadores.join(' / ') || '(sin jugadores registrados)'}`);
      console.log(`  Motivo: ${p.motivo ?? '—'}`);
      console.log(`  ID: ${p.id}\n`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
