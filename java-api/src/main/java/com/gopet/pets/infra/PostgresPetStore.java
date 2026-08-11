package com.gopet.pets.infra;

import com.gopet.pets.domain.PetStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** Persiste pets direto no Postgres via JDBC (tabela `pets`, ver supabase/schema.sql). */
@Component
@ConditionalOnProperty(prefix = "reserva", name = "store", havingValue = "postgres")
public class PostgresPetStore implements PetStore {

    private static final String SELECT_SQL = """
            select id, nome, idade_anos, porte, peso_kg, reativo, agressivo_pessoas, vacinas_em_dia,
                   restricoes_saude, observacoes
            from pets
            where tutor_id = :tutorId and deleted_at is null
            order by created_at desc
            """;

    private static final String INSERT_SQL = """
            insert into pets
                (id, tutor_id, nome, idade_anos, porte, peso_kg, reativo, agressivo_pessoas, vacinas_em_dia,
                 restricoes_saude, observacoes)
            values
                (:id::uuid, :tutorId, :nome, :idadeAnos, :porte::porte_pet, :pesoKg, :reativo, :agressivoPessoas,
                 :vacinasEmDia, :restricoesSaude, :observacoes)
            """;

    private final JdbcClient jdbcClient;

    public PostgresPetStore(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public boolean configurado() {
        return true; // com RESERVA_STORE=postgres o DataSource é obrigatório (ver PostgresJdbcConfig)
    }

    @Override
    public List<Map<String, Object>> listarPorTutor(String tutorId) {
        return jdbcClient.sql(SELECT_SQL).param("tutorId", tutorId).query().listOfRows();
    }

    @Override
    public void inserir(Map<String, Object> pet) {
        jdbcClient.sql(INSERT_SQL)
                .param("id", pet.get("id"))
                .param("tutorId", pet.get("tutor_id"))
                .param("nome", pet.get("nome"))
                .param("idadeAnos", pet.get("idade_anos"))
                .param("porte", pet.get("porte"))
                .param("pesoKg", pet.get("peso_kg"))
                .param("reativo", pet.get("reativo"))
                .param("agressivoPessoas", pet.get("agressivo_pessoas"))
                .param("vacinasEmDia", pet.get("vacinas_em_dia"))
                .param("restricoesSaude", pet.get("restricoes_saude"))
                .param("observacoes", pet.get("observacoes"))
                .update();
    }
}
