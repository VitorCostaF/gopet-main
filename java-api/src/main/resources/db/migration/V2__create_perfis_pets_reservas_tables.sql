-- ═══════════════════════════════════════════════════════════════
-- GO PET · Cadastro do tutor, pets e reservas · MySQL (migração Flyway)
-- Roda só via `mvn flyway:migrate` (java-api/), nunca automaticamente no
-- boot da aplicação — ver spring.flyway.enabled=false no application.yml.
--
-- Usada só quando RESERVA_STORE=mysql (ver MySqlUsuarioStore/MySqlPetStore/
-- MySqlReservaStore) — mesmo desenho de dados do supabase/schema.sql
-- (perfis/pets/reservas/reserva_pets), adaptado pros tipos do MySQL:
--   uuid          -> char(36)   (o próprio java-api gera o UUID em Java, ver
--                                 UUID.randomUUID() em PetService/ReservaService)
--   jsonb         -> json
--   timestamptz   -> datetime  (sempre em UTC, mesma convenção do resto do projeto)
--   enum (pg)     -> enum (mysql), mesmos valores
-- ═══════════════════════════════════════════════════════════════

-- ── Perfis (cadastro do tutor) ────────────────────────────────
-- id = "sub" do token Auth0 (ex.: "auth0|507f...", "google-oauth2|11371...").
CREATE TABLE perfis (
  id                VARCHAR(255) PRIMARY KEY,
  nome              VARCHAR(255) NOT NULL DEFAULT '',
  email             VARCHAR(255) NULL,
  endereco_padrao   JSON NULL,                  -- { cep, numero, instrucoes }
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Pets ───────────────────────────────────────────────────────
CREATE TABLE pets (
  id                  CHAR(36) PRIMARY KEY,
  tutor_id            VARCHAR(255) NOT NULL,
  nome                VARCHAR(40) NOT NULL,
  idade_anos          SMALLINT NULL,
  porte               ENUM('P','M','G') NOT NULL,
  peso_kg             DECIMAL(5,2) NULL,
  reativo             BOOLEAN NOT NULL DEFAULT FALSE,
  agressivo_pessoas   BOOLEAN NOT NULL DEFAULT FALSE,
  vacinas_em_dia      BOOLEAN NOT NULL DEFAULT FALSE,
  restricoes_saude    TEXT NULL,
  observacoes         VARCHAR(1000) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  CONSTRAINT fk_pets_tutor FOREIGN KEY (tutor_id) REFERENCES perfis(id),
  INDEX idx_pets_tutor (tutor_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Reservas ───────────────────────────────────────────────────
CREATE TABLE reservas (
  id                      CHAR(36) PRIMARY KEY,
  tutor_id                VARCHAR(255) NOT NULL,
  servico                 ENUM('passeio_30','passeio_60','creche_dia','hospedagem_pernoite') NOT NULL,
  inicio                  DATETIME NOT NULL,
  endereco                JSON NOT NULL,          -- snapshot { cep, numero, instrucoes }
  status                  ENUM('pendente_pagamento','confirmada','em_execucao','concluida',
                                'cancelada_tutor','cancelada_operacao','expirada') NOT NULL DEFAULT 'confirmada',
  preco_total_centavos    INT NOT NULL,
  whatsapp                VARCHAR(20) NULL,
  idempotency_key         VARCHAR(255) NULL,      -- único quando presente; MySQL permite vários NULL num UNIQUE
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at              DATETIME NULL,
  CONSTRAINT fk_reservas_tutor FOREIGN KEY (tutor_id) REFERENCES perfis(id),
  UNIQUE KEY idx_reservas_idem (idempotency_key),
  INDEX idx_reservas_tutor (tutor_id, inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vínculo reserva ↔ pet(s) — uma reserva pode levar mais de um pet do mesmo tutor.
CREATE TABLE reserva_pets (
  reserva_id  CHAR(36) NOT NULL,
  pet_id      CHAR(36) NOT NULL,
  PRIMARY KEY (reserva_id, pet_id),
  CONSTRAINT fk_reserva_pets_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE,
  CONSTRAINT fk_reserva_pets_pet FOREIGN KEY (pet_id) REFERENCES pets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
