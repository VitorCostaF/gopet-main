package com.gopet.usuarios.infra.mysql;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gopet.usuarios.domain.UsuarioStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Persiste o cadastro do tutor direto no MySQL via JDBC (tabela {@code perfis}, ver
 * db/migration/V2__create_perfis_pets_reservas_tables.sql). Reaproveita o mesmo
 * DataSource/JdbcClient do histórico de CEP (ver MySqlJdbcConfig) — mesma conexão,
 * mesmas variáveis MYSQL_URL/MYSQL_USERNAME/MYSQL_PASSWORD.
 */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "mysql")
public class MySqlUsuarioStore implements UsuarioStore {

    private static final String SELECT_SQL = """
            select id, nome, email, endereco_padrao
            from perfis
            where id = :id and deleted_at is null
            """;

    private static final String UPSERT_SQL = """
            insert into perfis (id, nome, email, endereco_padrao, updated_at)
            values (:id, :nome, :email, :enderecoPadrao, current_timestamp)
            on duplicate key update
                nome = values(nome),
                email = values(email),
                endereco_padrao = values(endereco_padrao),
                updated_at = current_timestamp
            """;

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public MySqlUsuarioStore(@Qualifier("mysqlJdbcClient") JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean configurado() {
        return true; // com RESERVA_STORE=mysql o DataSource é obrigatório (ver MySqlJdbcConfig)
    }

    @Override
    public Optional<Map<String, Object>> buscarPorId(String id) {
        return jdbcClient.sql(SELECT_SQL).param("id", id).query().listOfRows().stream()
                .findFirst()
                .map(this::comEnderecoDecodificado);
    }

    @Override
    public void salvar(Map<String, Object> usuario) {
        jdbcClient.sql(UPSERT_SQL)
                .param("id", usuario.get("id"))
                .param("nome", usuario.get("nome"))
                .param("email", usuario.get("email"))
                .param("enderecoPadrao", paraJson(usuario.get("endereco_padrao")))
                .update();
    }

    /** A coluna JSON volta do driver do MySQL como String — decodifica pra Map, mesmo shape que o Postgres/Supabase devolvem. */
    private Map<String, Object> comEnderecoDecodificado(Map<String, Object> row) {
        Map<String, Object> copia = new LinkedHashMap<>(row);
        Object enderecoRaw = copia.get("endereco_padrao");
        if (enderecoRaw instanceof String json && !json.isBlank()) {
            try {
                copia.put("endereco_padrao", objectMapper.readValue(json, Map.class));
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Endereço inválido lido do banco.", e);
            }
        }
        return copia;
    }

    private String paraJson(Object valor) {
        try {
            return objectMapper.writeValueAsString(valor);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Endereço inválido para persistência.", e);
        }
    }
}
