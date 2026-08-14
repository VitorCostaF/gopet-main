package com.gopet.reservas.infra.mysql;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gopet.reservas.domain.ReservaIdempotenteException;
import com.gopet.reservas.domain.ReservaStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Persiste a reserva direto no MySQL via JDBC (tabelas
 * {@code reservas}/{@code reserva_pets}, ver
 * db/migration/V2__create_perfis_pets_reservas_tables.sql). Reaproveita o mesmo
 * DataSource/JdbcClient do histórico de CEP (ver MySqlJdbcConfig).
 */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "mysql")
public class MySqlReservaStore implements ReservaStore {

    private static final String INSERT_SQL = """
            insert into reservas
                (id, tutor_id, servico, inicio, endereco, status, preco_total_centavos, whatsapp, idempotency_key)
            values
                (:id, :tutorId, :servico, :inicio, :endereco, :status, :precoTotalCentavos, :whatsapp, :idempotencyKey)
            """;

    private static final String VINCULAR_PET_SQL = """
            insert into reserva_pets (reserva_id, pet_id) values (:reservaId, :petId)
            """;

    private static final String SELECT_RESERVAS_SQL = """
            select id, servico, inicio, endereco, status, preco_total_centavos, whatsapp
            from reservas
            where tutor_id = :tutorId and deleted_at is null
            order by inicio desc
            """;

    private static final String SELECT_PETS_DAS_RESERVAS_SQL = """
            select reserva_id, pet_id
            from reserva_pets
            where reserva_id in (:reservaIds)
            """;

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public MySqlReservaStore(@Qualifier("mysqlJdbcClient") JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean configurado() {
        return true; // com RESERVA_STORE=mysql o DataSource é obrigatório (ver MySqlJdbcConfig)
    }

    @Override
    public void inserir(Map<String, Object> reserva) {
        try {
            jdbcClient.sql(INSERT_SQL)
                    .param("id", reserva.get("id"))
                    .param("tutorId", reserva.get("tutor_id"))
                    .param("servico", reserva.get("servico"))
                    .param("inicio", paraDatetime(reserva.get("inicio")))
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

    @Override
    public void vincularPets(String reservaId, List<String> petIds) {
        for (String petId : petIds) {
            jdbcClient.sql(VINCULAR_PET_SQL)
                .param("reservaId", reservaId)
                .param("petId", petId).update();
        }
    }

    @Override
    public List<Map<String, Object>> listarPorTutor(String tutorId) {
        List<Map<String, Object>> reservas = jdbcClient.sql(SELECT_RESERVAS_SQL)
            .param("tutorId", tutorId)
            .query()
            .listOfRows();

        if (reservas.isEmpty())
            return reservas;

        List<String> reservaIds =
            reservas.stream()
                .map(r -> String.valueOf(r.get("id")))
                .toList();

        List<Map<String, Object>> vinculos =
            jdbcClient.sql(SELECT_PETS_DAS_RESERVAS_SQL)
                .param("reservaIds", reservaIds)
                .query()
                .listOfRows();

        Map<String, List<String>> petsPorReserva = new LinkedHashMap<>();

        for (Map<String, Object> v : vinculos) {
            petsPorReserva.computeIfAbsent(String.valueOf(v.get("reserva_id")), k -> new ArrayList<>())
                    .add(String.valueOf(v.get("pet_id")));
        }

        for (Map<String, Object> reserva : reservas) {
            reserva.put("pet_ids", petsPorReserva.getOrDefault(String.valueOf(reserva.get("id")), List.of()));
            reserva.put("endereco", jsonParaMap(reserva.get("endereco")));
        }
        return reservas;
    }

    /**
     * A coluna JSON volta do driver do MySQL como String — decodifica pra Map,
     * mesmo shape que o Postgres/Supabase devolvem.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonParaMap(Object valor) {
        if (!(valor instanceof String json) || json.isBlank())
            return null;
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Endereço inválido lido do banco.", e);
        }
    }

    private String paraJson(Object valor) {
        try {
            return objectMapper.writeValueAsString(valor);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Endereço inválido para persistência.", e);
        }
    }

    /**
     * {@code reserva.get("inicio")} chega como String ISO-8601 (Instant.toString())
     * — o driver do MySQL
     * não aceita "T"/"Z" num DATETIME, então converte pra LocalDateTime em UTC
     * antes de bindar.
     */
    private static LocalDateTime paraDatetime(Object valor) {
        return LocalDateTime.ofInstant(Instant.parse(String.valueOf(valor)), ZoneOffset.UTC);
    }
}
