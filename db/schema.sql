-- ============================================================================
-- Pádel Life · Ranking de parejas — esquema PostgreSQL (Aiven). Idempotente.
-- Ejecutar con:  npm run db:migrate
-- ============================================================================

-- ---------- Configuración ----------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
  clave          text PRIMARY KEY,
  valor          text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

INSERT INTO configuracion (clave, valor) VALUES
  ('zona_horaria',            'America/Mazatlan'),   -- Tepic, Nayarit (zona Pacífico)
  ('inicio_ranking',          '2026-11-10'),         -- debe ser martes
  ('fin_ranking',             '2027-03-09'),
  ('fecha_limite_inscripcion','2026-11-09'),         -- último día con cuota inicial (inclusive)
  ('pausa_inicio',            '2026-12-21'),
  ('pausa_fin',               '2027-01-04'),
  ('cuota_inicial',           '200'),
  ('cuota_tardia',            '300'),
  ('eximir_primer_lugar',     'true'),               -- el 1er lugar no baja por inactividad (no puede retar hacia arriba)
  ('num_canchas',             '6'),
  ('club_telefono',           '3112556229'),
  ('club_direccion',          'Pendiente de confirmar — edítala en Configuración'),
  ('club_instagram',          'padel.lifetpc'),
  ('club_facebook',           'Pádel Life Tepic'),
  ('club_sitio',              'https://padellife.mx')
ON CONFLICT (clave) DO NOTHING;

-- ---------- Categorías -------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id               smallint PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  nombre           text NOT NULL,
  orden            smallint NOT NULL,
  superior_id      smallint REFERENCES categorias(id),
  solo_femenil     boolean NOT NULL DEFAULT false,
  sorteo_realizado boolean NOT NULL DEFAULT false,
  sorteo_en        timestamptz
);

INSERT INTO categorias (id, slug, nombre, orden, superior_id, solo_femenil) VALUES
  (1, 'libre',   'Libre',          1, NULL, false),
  (2, 'tercera', 'Tercera Fuerza', 2, 1,    false),
  (3, 'cuarta',  'Cuarta Fuerza',  3, 2,    false),
  (4, 'quinta',  'Quinta Fuerza',  4, 3,    false),
  (5, 'sexta',   'Sexta Fuerza',   5, 4,    false),
  (6, 'femenil', 'Femenil',        6, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- Parejas y jugadores ---------------------------------------------
CREATE TABLE IF NOT EXISTS parejas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id        smallint NOT NULL REFERENCES categorias(id),
  estado              text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','aprobada','rechazada','retirada')),
  posicion            integer CHECK (posicion IS NULL OR posicion > 0),
  telefono_contacto   text NOT NULL CHECK (telefono_contacto ~ '^[0-9]{10}$'),
  acepta_publicar     boolean NOT NULL CHECK (acepta_publicar),
  mixta               boolean NOT NULL DEFAULT false,
  cuota_por_jugador   integer NOT NULL CHECK (cuota_por_jugador >= 0),
  pago_confirmado     boolean NOT NULL DEFAULT false,
  motivo_cierre       text,
  es_demo             boolean NOT NULL DEFAULT false,
  creada_en           timestamptz NOT NULL DEFAULT now(),
  aprobada_en         timestamptz,
  retirada_en         timestamptz,
  CONSTRAINT parejas_posicion_unica UNIQUE (categoria_id, posicion) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT parejas_posicion_solo_aprobada CHECK (posicion IS NULL OR estado = 'aprobada')
);
CREATE INDEX IF NOT EXISTS parejas_estado_cat ON parejas (estado, categoria_id);

CREATE TABLE IF NOT EXISTS jugadores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id  uuid NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre     text NOT NULL CHECK (char_length(nombre) BETWEEN 3 AND 80),
  clave      text NOT NULL CHECK (char_length(clave) BETWEEN 3 AND 80),
  genero     char(1) NOT NULL CHECK (genero IN ('M','F')),
  telefono   text CHECK (telefono IS NULL OR telefono ~ '^[0-9]{10}$'),
  foto       bytea,
  foto_mime  text,
  activo     boolean NOT NULL DEFAULT true,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
-- Un jugador solo puede estar en una pareja activa (regla 1.1 del reglamento).
CREATE UNIQUE INDEX IF NOT EXISTS jugadores_clave_activa ON jugadores (clave) WHERE activo;
CREATE INDEX IF NOT EXISTS jugadores_pareja ON jugadores (pareja_id);

-- ---------- Jornadas (semanas martes → lunes 13:00) --------------------------
CREATE TABLE IF NOT EXISTS jornadas (
  id         serial PRIMARY KEY,
  numero     integer,
  inicio     timestamptz NOT NULL UNIQUE,
  cierre     timestamptz NOT NULL,
  tipo       text NOT NULL DEFAULT 'normal' CHECK (tipo IN ('normal','pausa')),
  estado     text NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada','cerrada')),
  cerrada_en timestamptz,
  CHECK (cierre > inicio)
);

-- ---------- Partidos ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id            integer NOT NULL REFERENCES jornadas(id),
  tipo                  text NOT NULL DEFAULT 'reto' CHECK (tipo IN ('reto','ascenso')),
  retadora_id           uuid NOT NULL REFERENCES parejas(id),
  retada_id             uuid NOT NULL REFERENCES parejas(id),
  categoria_retadora_id smallint NOT NULL REFERENCES categorias(id),
  categoria_retada_id   smallint NOT NULL REFERENCES categorias(id),
  pos_retadora          integer NOT NULL,
  pos_retada            integer NOT NULL,
  fecha_juego           timestamptz,
  cancha                smallint CHECK (cancha IS NULL OR cancha BETWEEN 1 AND 12),
  estado                text NOT NULL DEFAULT 'programado'
                        CHECK (estado IN ('programado','jugado','resuelto_club','cancelado','no_jugado')),
  sets                  jsonb,
  ganadora_id           uuid REFERENCES parejas(id),
  nota                  text,
  jugado_en             timestamptz,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  CHECK (retadora_id <> retada_id),
  CHECK (ganadora_id IS NULL OR ganadora_id IN (retadora_id, retada_id)),
  CHECK ((estado IN ('jugado','resuelto_club')) = (ganadora_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS partidos_jornada ON partidos (jornada_id);
CREATE UNIQUE INDEX IF NOT EXISTS partidos_reto_una_retadora
  ON partidos (jornada_id, retadora_id) WHERE tipo = 'reto' AND estado <> 'cancelado';
CREATE UNIQUE INDEX IF NOT EXISTS partidos_reto_una_retada
  ON partidos (jornada_id, retada_id) WHERE tipo = 'reto' AND estado <> 'cancelado';
CREATE UNIQUE INDEX IF NOT EXISTS partidos_ascenso_unico
  ON partidos (jornada_id, retadora_id) WHERE tipo = 'ascenso' AND estado <> 'cancelado';

-- ---------- Historial de movimientos ----------------------------------------
CREATE TABLE IF NOT EXISTS movimientos (
  id               bigserial PRIMARY KEY,
  jornada_id       integer REFERENCES jornadas(id),
  pareja_id        uuid NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  categoria_antes  smallint REFERENCES categorias(id),
  pos_antes        integer,
  categoria_despues smallint REFERENCES categorias(id),
  pos_despues      integer,
  motivo           text NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS movimientos_pareja ON movimientos (pareja_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS movimientos_jornada ON movimientos (jornada_id);

-- ---------- Administradores --------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  nombre        text,
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso timestamptz
);

-- ---------- Límite de intentos (rate limit atómico) --------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  clave          text PRIMARY KEY,
  ventana_inicio timestamptz NOT NULL,
  conteo         integer NOT NULL
);

CREATE OR REPLACE FUNCTION rate_limit_hit(p_clave text, p_ventana_seg integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_conteo integer;
BEGIN
  INSERT INTO rate_limits AS r (clave, ventana_inicio, conteo)
  VALUES (p_clave, now(), 1)
  ON CONFLICT (clave) DO UPDATE SET
    conteo = CASE WHEN r.ventana_inicio < now() - make_interval(secs => p_ventana_seg)
                  THEN 1 ELSE r.conteo + 1 END,
    ventana_inicio = CASE WHEN r.ventana_inicio < now() - make_interval(secs => p_ventana_seg)
                          THEN now() ELSE r.ventana_inicio END
  RETURNING conteo INTO v_conteo;
  RETURN v_conteo;
END $$;

-- ---------- Auditoría --------------------------------------------------------
-- audit_log: acción de negocio (quién, cuándo, qué dato) escrita por la aplicación.
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  ts         timestamptz NOT NULL DEFAULT now(),
  actor_id   uuid,
  actor      text NOT NULL,
  accion     text NOT NULL,
  entidad    text NOT NULL,
  entidad_id text,
  antes      jsonb,
  despues    jsonb,
  detalle    text,
  ip         text
);
CREATE INDEX IF NOT EXISTS audit_log_ts ON audit_log (ts DESC);

-- audit_cambios: cada UPDATE/DELETE sobre tablas críticas, capturado por trigger
-- (no depende de que el código se acuerde de registrar).
CREATE TABLE IF NOT EXISTS audit_cambios (
  id        bigserial PRIMARY KEY,
  ts        timestamptz NOT NULL DEFAULT now(),
  actor     text NOT NULL,
  tabla     text NOT NULL,
  operacion text NOT NULL,
  fila_id   text,
  antes     jsonb,
  despues   jsonb
);
CREATE INDEX IF NOT EXISTS audit_cambios_ts ON audit_cambios (ts DESC);

CREATE OR REPLACE FUNCTION audit_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_actor text := NULLIF(current_setting('app.actor', true), '');
  v_old   jsonb;
  v_new   jsonb;
  v_id    text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Operacion % sobre % rechazada: falta app.actor (quien la realiza)', TG_OP, TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD) - 'foto' - 'password_hash';
    v_id  := COALESCE(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'clave');
    INSERT INTO audit_cambios (actor, tabla, operacion, fila_id, antes) VALUES (v_actor, TG_TABLE_NAME, 'DELETE', v_id, v_old);
    RETURN OLD;
  END IF;

  -- UPDATE: solo si algo cambió realmente
  IF to_jsonb(NEW) = to_jsonb(OLD) THEN RETURN NEW; END IF;
  v_old := to_jsonb(OLD) - 'foto' - 'password_hash';
  v_new := to_jsonb(NEW) - 'foto' - 'password_hash';
  IF (to_jsonb(OLD) ? 'foto') AND (to_jsonb(OLD)->>'foto' IS DISTINCT FROM to_jsonb(NEW)->>'foto') THEN
    v_new := v_new || jsonb_build_object('foto_cambiada', true);
  END IF;
  v_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'clave');
  INSERT INTO audit_cambios (actor, tabla, operacion, fila_id, antes, despues) VALUES (v_actor, TG_TABLE_NAME, 'UPDATE', v_id, v_old, v_new);
  RETURN NEW;
END $$;

-- Las tablas de auditoría son de solo-agregar (no se editan ni se borran).
CREATE OR REPLACE FUNCTION audit_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Las tablas de auditoria son de solo lectura/agregado' USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS audit_log_inmutable ON audit_log;
CREATE TRIGGER audit_log_inmutable BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_inmutable();
DROP TRIGGER IF EXISTS audit_cambios_inmutable ON audit_cambios;
CREATE TRIGGER audit_cambios_inmutable BEFORE UPDATE OR DELETE ON audit_cambios
  FOR EACH ROW EXECUTE FUNCTION audit_inmutable();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['parejas','jugadores','partidos','configuracion','jornadas','categorias','admins']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$s', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s BEFORE UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION audit_trigger()', t);
  END LOOP;
END $$;

-- ---------- Generación del calendario de jornadas ----------------------------
-- Cada jornada va de martes 00:00 a lunes 13:00 (hora de Tepic). Las semanas cuyo
-- martes de inicio cae dentro de la pausa se marcan como 'pausa' (sin descensos).
CREATE OR REPLACE FUNCTION generar_jornadas() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_tz     text := (SELECT valor FROM configuracion WHERE clave = 'zona_horaria');
  v_ini    date := (SELECT valor FROM configuracion WHERE clave = 'inicio_ranking')::date;
  v_fin    date := (SELECT valor FROM configuracion WHERE clave = 'fin_ranking')::date;
  v_p_ini  date := (SELECT valor FROM configuracion WHERE clave = 'pausa_inicio')::date;
  v_p_fin  date := (SELECT valor FROM configuracion WHERE clave = 'pausa_fin')::date;
  d        date;
  v_iter   integer := 0;
  v_num    integer := 0;
  v_tipo   text;
  v_filas  integer;
  v_total  integer := 0;
BEGIN
  IF v_tz IS NULL OR v_ini IS NULL OR v_fin IS NULL OR v_p_ini IS NULL OR v_p_fin IS NULL THEN
    RAISE EXCEPTION 'Configuracion de fechas incompleta';
  END IF;
  IF EXTRACT(ISODOW FROM v_ini) <> 2 THEN
    RAISE EXCEPTION 'inicio_ranking debe ser martes (valor: %)', v_ini;
  END IF;
  IF v_fin <= v_ini THEN
    RAISE EXCEPTION 'fin_ranking debe ser posterior a inicio_ranking';
  END IF;
  IF v_fin - v_ini > 400 THEN
    RAISE EXCEPTION 'El ranking no puede durar mas de 400 dias';
  END IF;

  -- Regenera solo lo que aún no tiene partidos ni está cerrado.
  DELETE FROM jornadas j
   WHERE j.estado = 'programada'
     AND NOT EXISTS (SELECT 1 FROM partidos p WHERE p.jornada_id = j.id);

  d := v_ini;
  WHILE d < v_fin LOOP
    v_iter := v_iter + 1;
    IF v_iter > 80 THEN RAISE EXCEPTION 'Demasiadas jornadas generadas'; END IF;

    v_tipo := CASE WHEN d BETWEEN v_p_ini AND v_p_fin THEN 'pausa' ELSE 'normal' END;
    IF v_tipo = 'normal' THEN v_num := v_num + 1; END IF;

    INSERT INTO jornadas (numero, inicio, cierre, tipo, estado)
    VALUES (
      CASE WHEN v_tipo = 'normal' THEN v_num END,
      (d::timestamp) AT TIME ZONE v_tz,
      ((d + 6)::timestamp + interval '13 hours') AT TIME ZONE v_tz,
      v_tipo,
      CASE WHEN v_tipo = 'pausa' THEN 'cerrada' ELSE 'programada' END
    )
    ON CONFLICT (inicio) DO NOTHING;
    GET DIAGNOSTICS v_filas = ROW_COUNT;
    v_total := v_total + v_filas;

    d := d + 7;
  END LOOP;
  RETURN v_total;
END $$;
