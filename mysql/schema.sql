-- ═══════════════════════════════════════════════════════════════
-- GO PET · Histórico de consultas de CEP · MySQL
-- Rodar direto no servidor MySQL usado pelo java-api (ver MYSQL_URL).
-- Guarda cada consulta feita em GET /cobertura: cep pesquisado, cep base
-- da GO PET, distância calculada e o raio máximo de atendimento vigente.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consultas_cep (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  cep_consultado    VARCHAR(8) NOT NULL,
  cep_base          VARCHAR(8) NOT NULL,
  distancia_km      DECIMAL(10,3) NULL,      -- nulo quando o provider não encontrou o CEP
  raio_maximo_km    DECIMAL(10,3) NOT NULL,
  atende            BOOLEAN NOT NULL,
  motivo            VARCHAR(50) NULL,        -- ex.: CEP_NAO_ENCONTRADO, quando aplicável
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consultas_cep_cep_consultado (cep_consultado),
  INDEX idx_consultas_cep_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
