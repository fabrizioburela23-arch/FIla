-- ══════════════════════════════════════════════════════════════════════════════
-- Fila — Queue Management SaaS
-- PostgreSQL Schema v1.0 — Multi-tenant
--
-- REGLA FINANCIERA: precio_venta = costo / (1 - margen_deseado)
-- Ejemplo: costo 122.50 BOB, margen 65% → precio = 122.50 / (1-0.65) = 350 BOB
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE account_status     AS ENUM ('active', 'suspended', 'cancelled', 'trialing');
CREATE TYPE user_role          AS ENUM ('admin', 'manager', 'operator');
CREATE TYPE user_status        AS ENUM ('active', 'inactive');
CREATE TYPE operator_status    AS ENUM ('online', 'busy', 'paused', 'offline');
CREATE TYPE ticket_status      AS ENUM ('waiting', 'called', 'attending', 'completed', 'no_show', 'transferred', 'cancelled');
CREATE TYPE ticket_source      AS ENUM ('qr', 'web', 'manual');
CREATE TYPE ticket_event_type  AS ENUM ('created', 'called', 'attending', 'completed', 'no_show', 'transferred', 'cancelled', 'recalled');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'cancelled');

-- ─── PLANS (Planes SaaS) ──────────────────────────────────────────────────────
-- price = cost / (1 - margin)  ← NUNCA markup

CREATE TABLE plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  cost         DECIMAL(10,2) NOT NULL,    -- Costo operativo base
  margin       DECIMAL(5,4)  NOT NULL,    -- Ej: 0.65 = 65% de margen sobre precio
  price        DECIMAL(10,2) NOT NULL,    -- cost / (1 - margin)
  -- Límites operativos del plan
  max_branches              INT     DEFAULT 1,
  max_operators_per_branch  INT     DEFAULT 5,
  max_services_per_branch   INT     DEFAULT 5,
  max_tickets_per_day       INT     DEFAULT 500,
  features     JSONB   DEFAULT '{}',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint: el precio siempre debe ser >= al resultado de la fórmula de margen
  CONSTRAINT chk_price_margin CHECK (
    ABS(price - (cost / (1 - margin))) < 0.01
  )
);

-- ─── ACCOUNTS (Tenants / Empresas) ───────────────────────────────────────────

CREATE TABLE accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,   -- Identificador URL/subdominio
  email      VARCHAR(255) UNIQUE NOT NULL,
  phone      VARCHAR(50),
  logo_url   TEXT,
  status     account_status DEFAULT 'active',
  settings   JSONB DEFAULT '{}',             -- Config personalizada del tenant
  plan_id    UUID REFERENCES plans(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS (Suscripciones SaaS) ──────────────────────────────────────

CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES plans(id),
  status               subscription_status DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  trial_end            TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (Usuarios del sistema) ────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  avatar_url    TEXT,
  role          user_role   NOT NULL,
  status        user_status DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, email)
);

-- ─── BRANCHES (Sucursales) ────────────────────────────────────────────────────

CREATE TABLE branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  address    TEXT,
  city       VARCHAR(100),
  country    VARCHAR(10) DEFAULT 'BO',
  phone      VARCHAR(50),
  timezone   VARCHAR(50) DEFAULT 'America/La_Paz',
  qr_code_url TEXT,                       -- URL del QR generado para imprimir
  is_open    BOOLEAN DEFAULT FALSE,
  settings   JSONB   DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICES (Servicios / Colas) ────────────────────────────────────────────

CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id),    -- desnormalizado
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  prefix           CHAR(1) NOT NULL,           -- Letra identificadora: A, B, C...
  color            VARCHAR(7) DEFAULT '#3B82F6',
  icon_name        VARCHAR(50),
  -- Tiempo promedio de atención en segundos; se recalcula con los últimos 3 turnos
  avg_attention_secs INT DEFAULT 300,
  is_active        BOOLEAN DEFAULT TRUE,
  position         INT     DEFAULT 0,          -- Orden en la UI del cliente
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, prefix),
  CONSTRAINT chk_prefix CHECK (prefix ~ '^[A-Z]$')
);

-- ─── OPERATORS (Ventanillas / Módulos) ───────────────────────────────────────

CREATE TABLE operators (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES accounts(id),
  user_id           UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,     -- "Ventanilla 1", "Módulo A"
  display_name      VARCHAR(50) NOT NULL,      -- Texto en pantalla TV: "V1", "A"
  status            operator_status DEFAULT 'offline',
  -- IDs de servicios que este operador puede atender
  service_ids       UUID[] DEFAULT '{}',
  current_ticket_id UUID,                      -- FK circular, se añade abajo
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TICKETS (Turnos) ─────────────────────────────────────────────────────────

CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID NOT NULL REFERENCES services(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  account_id      UUID NOT NULL REFERENCES accounts(id),
  operator_id     UUID REFERENCES operators(id) ON DELETE SET NULL,
  ticket_number   VARCHAR(10) NOT NULL,         -- "A-014", "C-007"
  sequence_number INT         NOT NULL,         -- Número secuencial del día
  customer_name   VARCHAR(255),                 -- NULL = anónimo
  customer_phone  VARCHAR(50),
  status          ticket_status DEFAULT 'waiting',
  priority        SMALLINT      DEFAULT 0,      -- 0=normal, 1=priority, 2=VIP
  source          ticket_source DEFAULT 'qr',
  notes           TEXT,
  -- Métricas de tiempo (segundos, calculadas al completar)
  waited_secs     INT,
  attention_secs  INT,
  -- Timestamps de transición de estado
  called_at       TIMESTAMPTZ,
  attended_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Un ticket_number es único por sucursal + servicio + día operativo
  UNIQUE (branch_id, service_id, ticket_number, DATE(created_at))
);

-- FK circular Operator → Ticket (se puede agregar después de crear tickets)
ALTER TABLE operators
  ADD CONSTRAINT fk_current_ticket
  FOREIGN KEY (current_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;

-- ─── TICKET EVENTS (Audit trail / historial de estados) ───────────────────────

CREATE TABLE ticket_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  event_type  ticket_event_type NOT NULL,
  from_status ticket_status,
  to_status   ticket_status,
  metadata    JSONB DEFAULT '{}',             -- datos extra (transfer target, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DAILY SEQUENCES (Numeración diaria por servicio) ────────────────────────

CREATE TABLE daily_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  last_sequence INT  NOT NULL DEFAULT 0,
  UNIQUE (service_id, date)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES — Optimizados para queries críticos de tiempo real
-- ══════════════════════════════════════════════════════════════════════════════

-- Turnos activos por sucursal (query más frecuente del sistema)
CREATE INDEX idx_tickets_branch_active
  ON tickets (branch_id, status, created_at)
  WHERE status IN ('waiting', 'called', 'attending');

-- Turnos activos por servicio (para calcular posición en fila y ETA)
CREATE INDEX idx_tickets_service_active
  ON tickets (service_id, status, created_at)
  WHERE status IN ('waiting', 'called', 'attending');

-- Query general de turnos por estado y fecha
CREATE INDEX idx_tickets_status_date    ON tickets (status, DATE(created_at));
CREATE INDEX idx_tickets_account_date   ON tickets (account_id, DATE(created_at));

-- Eventos de turno (para reconstruir historial y calcular TPA/TPE)
CREATE INDEX idx_ticket_events_ticket   ON ticket_events (ticket_id, created_at);

-- Operadores por sucursal y estado (para pantalla de selección)
CREATE INDEX idx_operators_branch_status ON operators (branch_id, status);

-- Servicios activos de una sucursal (pantalla QR del cliente)
CREATE INDEX idx_services_branch_active  ON services (branch_id, is_active, position);

-- Sucursales de un tenant
CREATE INDEX idx_branches_account        ON branches (account_id);

-- Usuarios de un tenant por rol
CREATE INDEX idx_users_account_role      ON users (account_id, role);

-- Secuencias diarias (acceso atómico al generar número de turno)
CREATE INDEX idx_daily_seq_service_date  ON daily_sequences (service_id, date);

-- Suscripciones activas de un tenant
CREATE INDEX idx_subscriptions_account   ON subscriptions (account_id, status);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN AUXILIAR — Generar número de turno atómicamente
-- Garantiza secuencia sin colisiones en entornos concurrentes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_next_ticket_number(
  p_service_id UUID,
  p_branch_id  UUID,
  p_prefix     CHAR
) RETURNS TABLE (sequence_num INT, ticket_num VARCHAR) AS $$
DECLARE
  v_seq INT;
BEGIN
  INSERT INTO daily_sequences (service_id, branch_id, date, last_sequence)
  VALUES (p_service_id, p_branch_id, CURRENT_DATE, 1)
  ON CONFLICT (service_id, date) DO UPDATE
    SET last_sequence = daily_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  RETURN QUERY SELECT
    v_seq,
    (p_prefix || '-' || LPAD(v_seq::TEXT, 3, '0'))::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN AUXILIAR — Calcular ETA (Tiempo Estimado de Espera)
-- Promedio de los últimos 3 turnos completados en el servicio
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_eta_seconds(
  p_service_id    UUID,
  p_position      INT    -- Posición en fila (personas adelante)
) RETURNS INT AS $$
DECLARE
  v_avg_secs INT;
BEGIN
  SELECT COALESCE(
    AVG(attention_secs)::INT,
    300   -- fallback: 5 minutos si no hay histórico
  ) INTO v_avg_secs
  FROM (
    SELECT attention_secs
    FROM tickets
    WHERE service_id   = p_service_id
      AND status       = 'completed'
      AND attention_secs IS NOT NULL
      AND DATE(created_at) = CURRENT_DATE
    ORDER BY completed_at DESC
    LIMIT 3
  ) recent;

  RETURN v_avg_secs * p_position;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER — Actualizar updated_at automáticamente
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_operators_updated_at
  BEFORE UPDATE ON operators
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Planes SaaS base (precio = costo / (1 - margen))
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO plans (name, description, cost, margin, price, max_branches, max_operators_per_branch, max_services_per_branch, max_tickets_per_day, features)
VALUES
  (
    'Starter',
    'Para negocios pequeños que dan sus primeros pasos',
    122.50,   -- costo BOB/mes — costo operativo base
    0.65,     -- 65% margen sobre precio de venta
    350.00,   -- 122.50 / (1 - 0.65) = 350 BOB/mes ≈ $50 USD
    1, 3, 3, 200,
    '{"analytics_basic": true, "qr_generator": true, "tv_display": false}'
  ),
  (
    'Business',
    'Para clínicas, farmacias y empresas con múltiples sucursales',
    367.50,
    0.65,
    1050.00,  -- 367.50 / (1 - 0.65) = 1050 BOB/mes ≈ $150 USD
    5, 10, 10, 2000,
    '{"analytics_advanced": true, "qr_generator": true, "tv_display": true, "webhooks": true, "transfer": true}'
  ),
  (
    'Enterprise',
    'Para bancos, hospitales y corporativos de alto volumen',
    980.00,
    0.65,
    2800.00,  -- 980 / (1 - 0.65) = 2800 BOB/mes ≈ $400 USD
    999, 999, 999, 999999,
    '{"analytics_advanced": true, "qr_generator": true, "tv_display": true, "webhooks": true, "transfer": true, "api_access": true, "white_label": true, "priority_support": true}'
  );
