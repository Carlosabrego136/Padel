# Pádel Life · Ranking

Sistema web de ranking por parejas para el club Pádel Life (Tepic, Nayarit). Next.js 14 (App Router) + PostgreSQL en Aiven, listo para desplegar en Vercel.

## Requisitos

- Node.js 18.17 o superior (recomendado 18 LTS o 20 LTS).
- Una base de datos PostgreSQL en Aiven (o cualquier Postgres compatible).

## 1. Instalación local

```bash
npm install
```

Copia `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URI de conexión de Aiven (pestaña **Overview** → "Service URI"). Incluye `?sslmode=require`. |
| `DATABASE_CA` | (Opcional pero recomendado) Certificado CA de Aiven en PEM, pegado completo. Si se omite, la conexión usa TLS sin verificar la cadena del certificado. |
| `AUTH_SECRET` | Cadena aleatoria de al menos 32 caracteres para firmar la sesión del panel. Generar con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CRON_SECRET` | Cadena aleatoria de al menos 16 caracteres para proteger el cron semanal. Vercel la envía automáticamente como `Authorization: Bearer` cuando la variable se llama `CRON_SECRET`. |

## 2. Base de datos

Con `DATABASE_URL` configurada en `.env`, ejecuta en orden:

```bash
npm run db:migrate
```

Esto crea todas las tablas, triggers de auditoría y la función que genera las jornadas semanales (martes a lunes, con la pausa de fin de año ya configurada). El script es idempotente: se puede volver a ejecutar sin duplicar nada.

Crear el primer administrador del panel:

```bash
npm run db:admin
```

Pide correo y contraseña de forma interactiva (o acepta `npm run db:admin correo@ejemplo.com contraseña` como argumentos).

(Opcional) Cargar datos de demostración para probar el ranking sin inscripciones reales:

```bash
npm run db:demo
```

Crea parejas de prueba (marcadas internamente como demo) en las 6 categorías. No afecta datos reales y se puede omitir en producción.

## 3. Desarrollo local

```bash
npm run dev
```

Abre `http://localhost:3000`. El panel de administración está en `/admin/login`.

## 4. Verificación antes de desplegar

```bash
npm run typecheck   # TypeScript
npm test            # Vitest (motor de ranking y validación de marcadores)
npm run build        # Compilación de producción
```

## 5. Despliegue en Vercel

1. Sube el proyecto a un repositorio de Git (GitHub/GitLab/Bitbucket) o despliega directo con la CLI de Vercel.
2. En el proyecto de Vercel, agrega las variables de entorno (`DATABASE_URL`, `DATABASE_CA`, `AUTH_SECRET`, `CRON_SECRET`) en **Settings → Environment Variables**, para los entornos de Production y Preview.
3. Despliega. Vercel detecta Next.js automáticamente.
4. El archivo `vercel.json` ya configura el cron job que cierra automáticamente las jornadas vencidas todos los días a las 23:00 UTC (17:00 hora de Tepic/Mazatlán). No requiere configuración adicional, siempre que `CRON_SECRET` esté definido.
5. Ejecuta `npm run db:migrate` y `npm run db:admin` apuntando a la base de datos de producción (puedes correrlos desde tu máquina local con el `.env` de producción, o desde la terminal de Vercel).

## 6. Estructura del proyecto

```
src/
  app/                    Páginas y rutas API (App Router)
    admin/                Panel de administración (protegido por middleware + sesión)
    api/                  Rutas API (públicas y de administración)
    ranking/, pareja/,    Páginas públicas
    inscripcion/, reglamento/
  components/             Componentes compartidos (header, hero)
  lib/
    db.ts                 Pool de PostgreSQL, reintentos acotados, transacciones con auditoría
    ranking/
      engine.ts           Motor puro del ranking (sin acceso a base de datos)
      service.ts          Lógica de negocio (transacciones, auditoría)
      score.ts            Validación de marcadores (mejor de 3 sets)
    validation.ts         Esquemas de validación (zod) para toda entrada de datos
    auth.ts, session.ts    Autenticación del panel (bcrypt + JWT en cookie httpOnly)
db/schema.sql             Esquema completo de la base de datos
scripts/                  Migración, creación de administrador, datos de demostración
tests/                    Pruebas del motor de ranking y validación de marcadores
```

## 7. Reglas del sistema (confirmar con el club antes de operar)

- **Categorías:** Libre, Tercera, Cuarta, Quinta, Sexta, Femenil (en ese orden de superioridad; Femenil es independiente).
- **Jornadas:** semanales, de martes 00:00 a lunes 13:00 (hora de Tepic/Mazatlán).
- **Retos:** una pareja puede retar a la que está una posición arriba en su categoría.
- **Ascenso:** el 1er lugar de una categoría puede retar al último lugar de la categoría superior.
- **Marcador:** mejor de 3 sets. Los sets 1 y 2 son normales (hasta 6, con 7-5 o 7-6 en caso de empate a 6); el 3er set es un super tie-break a 10 puntos con 2 de diferencia.
- **Pausa de fin de año:** del 21 de diciembre al 4 de enero (sin jornadas ni cierres durante ese periodo).
- **Cuota de inscripción:** $200 MXN por jugador hasta la fecha límite; $300 MXN después. Fechas y montos son editables desde el panel (**Configuración**).

Estas reglas, fechas y montos quedaron configurados según lo acordado con el club al momento de la entrega; cualquier ajuste se hace desde el panel de administración sin necesidad de tocar código.

## 8. Pendientes de contenido (no bloquean el despliegue)

- **Video del hero:** el componente `HeroMotion` espera el archivo en `public/brand/hero.mp4` y un poster en `public/brand/hero-poster.jpg`. Si no se agregan, el hero se ve igual (solo con el fondo degradado, sin video).
- **Fotos de jugadores:** opcionales en la inscripción; si no se suben, el sistema no falla.
