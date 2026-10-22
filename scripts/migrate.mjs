#!/usr/bin/env node
/**
 * Pádel Life · Migración: aplica db/schema.sql y genera jornadas.
 * Uso: npm run db:migrate
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const TIMEOUT_MS = 30_000;
const timer = setTimeout(() => {
  console.error('⛔ Migración abortada: tiempo límite de 30 s excedido.');
  process.exit(1);
}, TIMEOUT_MS);
timer.unref?.();

function buildPool() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('⛔ Falta la variable DATABASE_URL');
    process.exit(1);
  }
  const url = new URL(raw.replace(/^postgresql:/i, 'postgres:'));
  const sslmode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  let ssl;
  if (sslmode === 'disable' || (isLocal && !sslmode)) {
    ssl = false;
  } else if (process.env.DATABASE_CA?.trim()) {
    ssl = { ca: process.env.DATABASE_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  } else {
    console.warn('⚠️  Sin DATABASE_CA: la conexión TLS no verificará el certificado del servidor.');
    ssl = { rejectUnauthorized: false };
  }

  return new pg.Pool({
    connectionString: url.toString(),
    ssl,
    max: 1,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 25_000,
  });
}

async function main() {
  const pool = buildPool();
  const client = await pool.connect();
  try {
    const schemaPath = resolve(__dirname, '..', 'db', 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf-8');

    console.log('🔧 Aplicando db/schema.sql …');
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.actor', 'script:migrate', true)");
    await client.query(sql);

    const res = await client.query('SELECT generar_jornadas() AS n');
    const n = res.rows[0]?.n ?? 0;

    await client.query('COMMIT');
    console.log(`✅ Migración completada. Jornadas generadas/actualizadas: ${n}`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* best effort */ }
    console.error('⛔ Error en la migración:', err.message ?? err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    clearTimeout(timer);
  }
}

main();
