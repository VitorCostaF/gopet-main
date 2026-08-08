package com.gopet.cobertura.infra.mysql;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;

import javax.sql.DataSource;

/**
 * DataSource/JdbcClient do MySQL usados só para o histórico de consultas de CEP (ver MySqlConsultaCepStore).
 * O pool é lazy (só conecta no primeiro uso), então sem MYSQL_URL configurado o bean existe mas nunca é
 * efetivamente usado — MySqlConsultaCepStore.configurado() barra a escrita antes disso.
 */
@Configuration
public class MySqlJdbcConfig {

    @Bean
    public DataSource mysqlDataSource(@Value("${mysql.url:}") String url,
                                       @Value("${mysql.username:}") String username,
                                       @Value("${mysql.password:}") String password) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return dataSource;
    }

    @Bean
    public JdbcClient mysqlJdbcClient(@Qualifier("mysqlDataSource") DataSource mysqlDataSource) {
        return JdbcClient.create(mysqlDataSource);
    }
}
