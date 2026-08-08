package com.gopet.cobertura.infra.mysql;

import com.gopet.cobertura.domain.ConsultaCepRegistro;
import com.gopet.cobertura.domain.ConsultaCepStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Persiste o histórico de consultas de CEP no MySQL (tabela `consultas_cep`, ver mysql/schema.sql). */
@Component
public class MySqlConsultaCepStore implements ConsultaCepStore {

    private static final String INSERT_SQL = """
            insert into consultas_cep
                (cep_consultado, cep_base, distancia_km, raio_maximo_km, atende, motivo)
            values
                (:cepConsultado, :cepBase, :distanciaKm, :raioMaximoKm, :atende, :motivo)
            """;

    private final JdbcClient jdbcClient;
    private final String url;

    public MySqlConsultaCepStore(@Qualifier("mysqlJdbcClient") JdbcClient jdbcClient,
                                  @Value("${mysql.url:}") String url) {
        this.jdbcClient = jdbcClient;
        this.url = url;
    }

    /** Sem MYSQL_URL configurado, o histórico fica desligado (ver DistanciaCepService, best-effort). */
    @Override
    public boolean configurado() {
        return url != null && !url.isBlank();
    }

    @Override
    public void salvar(ConsultaCepRegistro registro) {
        jdbcClient.sql(INSERT_SQL)
                .param("cepConsultado", registro.cepConsultado())
                .param("cepBase", registro.cepBase())
                .param("distanciaKm", registro.distanciaKm())
                .param("raioMaximoKm", registro.raioMaximoKm())
                .param("atende", registro.atende())
                .param("motivo", registro.motivo())
                .update();
    }
}
