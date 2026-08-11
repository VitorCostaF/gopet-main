package com.gopet.usuarios.infra;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gopet.usuarios.domain.UsuarioStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Persiste o cadastro do tutor direto no Postgres via JDBC (tabela `perfis`, ver supabase/schema.sql). */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "postgres")
public class PostgresUsuarioStore implements UsuarioStore {

    private static final String SELECT_SQL = """
            select id, nome, email, endereco_padrao
            from perfis
            where id = :id and deleted_at is null
            """;

    private static final String UPSERT_SQL = """
            insert into perfis (id, nome, email, endereco_padrao, updated_at)
            values (:id, :nome, :email, :enderecoPadrao::jsonb, now())
            on conflict (id) do update set
                nome = excluded.nome,
                email = excluded.email,
                endereco_padrao = excluded.endereco_padrao,
                updated_at = now()
            """;

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public PostgresUsuarioStore(JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean configurado() {
        return true; // com RESERVA_STORE=postgres o DataSource é obrigatório (ver PostgresJdbcConfig)
    }

    @Override
    public Optional<Map<String, Object>> buscarPorId(String id) {
        List<Map<String, Object>> linhas = jdbcClient.sql(SELECT_SQL).param("id", id).query().listOfRows();
        return linhas.isEmpty() ? Optional.empty() : Optional.of(linhas.get(0));
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

    private String paraJson(Object valor) {
        try {
            return objectMapper.writeValueAsString(valor);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Endereço inválido para persistência.", e);
        }
    }
}
