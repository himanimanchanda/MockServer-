-- =============================================================================
-- Mock Server — Optimized Schema (PostgreSQL)
-- =============================================================================
-- 4 tables total:
--   1. mock_endpoints     — core mock definitions (JSONB columns for maps)
--   2. audit_trail        — unified audit log
--   3. projects           — project groups
--   4. system_users       — authentication users
--
-- Previous schema had 11 tables including:
--   - 3 join tables (mock_request_headers, mock_request_query_params, mock_response_headers)
--   - 3 Envers audit tables (revinfo, mock_audit_history, mock_request_headers_AUD, etc.)
--   - permanently_deleted_mocks archive table
--   - request_logs table
-- All of these are replaced by JSONB columns and a single audit_trail table.
-- =============================================================================

-- ── 1. Projects ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          CHAR(36)     PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_by  VARCHAR(200),
    owner_olm_id VARCHAR(200),
    created_at  TIMESTAMP    DEFAULT NOW(),
    updated_at  TIMESTAMP    DEFAULT NOW()
);

-- ── 2. Mock Endpoints ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_endpoints (
    id                      CHAR(36)     PRIMARY KEY,
    project_id              CHAR(36)     NOT NULL REFERENCES projects(id),
    endpoint                VARCHAR(512) NOT NULL,
    method                  VARCHAR(16)  NOT NULL,
    request_body            TEXT,
    response_body           TEXT         NOT NULL DEFAULT '{}',
    status_code             INT          NOT NULL DEFAULT 200,
    headers                 JSONB        DEFAULT '{}',
    query_params            JSONB        DEFAULT '{}',
    response_headers        JSONB        DEFAULT '{}',
    delay_ms                BIGINT       DEFAULT 0,
    content_type            VARCHAR(128) DEFAULT 'application/json',
    description             VARCHAR(4000),
    test_case               VARCHAR(2000),
    is_deleted              BOOLEAN      NOT NULL DEFAULT FALSE,
    is_permanently_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_temp                 BOOLEAN      DEFAULT FALSE,
    toggle_response         BOOLEAN      DEFAULT FALSE,
    environment             VARCHAR(16)  NOT NULL DEFAULT 'DEV',
    created_at              TIMESTAMP    DEFAULT NOW(),
    updated_at              TIMESTAMP    DEFAULT NOW(),
    created_by              VARCHAR(200),
    updated_by              VARCHAR(200)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_mock_env_method ON mock_endpoints(environment, method);
CREATE INDEX IF NOT EXISTS idx_mock_env_method_endpoint ON mock_endpoints(environment, method, endpoint);
CREATE INDEX IF NOT EXISTS idx_mock_project ON mock_endpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_mock_deleted ON mock_endpoints(is_deleted, is_permanently_deleted);

-- ── 3. Audit Trail (unified) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_trail (
    id             BIGSERIAL    PRIMARY KEY,
    performed_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    entity_type    VARCHAR(48)  NOT NULL,
    entity_id      VARCHAR(64)  NOT NULL,
    action         VARCHAR(24)  NOT NULL,
    actor_olm_id   VARCHAR(200),
    summary        TEXT,
    path           VARCHAR(512),
    request_body   TEXT,
    response_body  TEXT,
    project_name   VARCHAR(256)
);

CREATE INDEX IF NOT EXISTS idx_audit_performed ON audit_trail(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type, entity_id);

-- ── 4. System Users ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_users (
    id           BIGSERIAL    PRIMARY KEY,
    olm_id       VARCHAR(200) NOT NULL UNIQUE,
    email        VARCHAR(255),
    password     VARCHAR(500) NOT NULL,
    display_name VARCHAR(255),
    created_at   TIMESTAMP    DEFAULT NOW(),
    updated_at   TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_olm ON system_users(olm_id);
