package com.gopet.reservas.infra;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gopet.reservas.domain.ReservaIdempotenteException;
import com.gopet.reservas.domain.ReservaStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Persiste a reserva direto no Postgres via JDBC (tabela `reservas`, ver supabase/schema.sql). */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "postgres")
public class PostgresReservaStore implements ReservaStore {

    private static final String INSERT_SQL = """
            insert into reservas
                (id, tutor_id, servico, inicio, endereco, status, preco_total_centavos, whatsapp, idempotency_key)
            values
                (:id::uuid, :tutorId::uuid, :servico::tipo_servico, :inicio::timestamptz, :endereco::jsonb,
                 :status::status_reserva, :precoTotalCentavos, :whatsapp, :idempotencyKey)
            """;

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public PostgresReservaStore(JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean configurado() {
        return true; // com RESERVA_STORE=postgres o DataSource é obrigatório (ver PostgresJdbcConfig)
    }

    @Override
    public void inserir(Map<String, Object> reserva) {
        try {
            jdbcClient.sql(INSERT_SQL)
                    .param("id", reserva.get("id"))
                    .param("tutorId", reserva.get("tutor_id"))
                    .param("servico", reserva.get("servico"))
                    .param("inicio", reserva.get("inicio"))
                    .param("endereco", paraJson(reserva.get("endereco")))
                    .param("status", reserva.get("status"))
                    .param("precoTotalCentavos", reserva.get("preco_total_centavos"))
                    .param("whatsapp", reserva.get("whatsapp"))
                    .param("idempotencyKey", reserva.get("idempotency_key"))
                    .update();
        } catch (DuplicateKeyException e) {
            throw new ReservaIdempotenteException();
        }
    }

    private String paraJson(Object valor) {
        try {
            return objectMapper.writeValueAsString(valor);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Endereço inválido para persistência.", e);
        }
    }
}
