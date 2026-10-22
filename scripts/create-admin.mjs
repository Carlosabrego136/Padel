#!/usr/bin/env node
/**
 * Pádel Life · Crear administrador.
 * Uso: npm run db:admin [email] [password]
 *   Sin argumentos: solicita email y contraseña de forma interactiva.
 */
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const TIMEOUT_MS = 30_000;
const timer = setTimeout(() => {
  console.error('⛔ Tiempo límite de 30 s excedido.');
  process.exit(1);
}, TIMEOUT_MS);
timer.unref?.();

const BCRYPT_COST = 12;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

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
    ssl = { rejectUnauthorized: false };
  }

  return new pg.Pool({
    connectionString: url.toString(),
    ssl,
    max: 1,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 15_000,
  });
}

function ask(question, hidden = false) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);
      let buf = '';
      const onData = (ch) => {
        const c = ch.toString();
        if (c === '\n' || c === '\r') {
          if (stdin.setRawMode) stdin.setRawMode(wasRaw);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          res(buf);
        } else if (c === '\u0003') {
          process.exit(130);
        } else if (c === '\u007f' || c === '\b') {
          buf = buf.slice(0, -1);
        } else {
          buf += c;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        res(answer.trim());
      });
    }
  });
}

async function main() {
  let email = process.argv[2] || '';
  let password = process.argv[3] || '';

  if (!email) {
    email = await ask('Correo del administrador: ');
  }
  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    console.error('⛔ Correo no válido.');
    process.exitCode = 1;
    return;
  }

  if (!password) {
    password = await ask('Contraseña (mín. 10 caracteres): ', true);
  }
  if (password.length < 10 || password.length > 128) {
    console.error('⛔ La contraseña debe tener entre 10 y 128 caracteres.');
    process.exitCode = 1;
    return;
  }

  const pool = buildPool();
  try {
    console.log('🔑 Generando hash …');
    const hash = await bcrypt.hash(password, BCRYPT_COST);

    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('app.actor', 'script:create-admin', true)");
      const res = await client.query(
        `INSERT INTO admins (email, password_hash, nombre, activo)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [email, hash, email.split('@')[0]],
      );

      if (res.rowCount === 0) {
        console.warn(`⚠️  Ya existe un administrador con el correo ${email}. No se hizo ningún cambio.`);
      } else {
        console.log(`✅ Administrador creado: ${email} (id: ${res.rows[0].id})`);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('⛔ Error:', err.message ?? err);
    process.exitCode = 1;
  } finally {
    await pool.end();
    clearTimeout(timer);
  }
}

main();
