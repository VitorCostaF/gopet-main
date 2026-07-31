package com.gopet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.JdbcClientAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration;

// DataSource/JdbcClient não são auto-configurados: só existem com RESERVA_STORE=postgres
// (ver PostgresJdbcConfig), pra API subir sem exigir Postgres quando ninguém pediu esse store.
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        JdbcTemplateAutoConfiguration.class,
        JdbcClientAutoConfiguration.class
})
public class JavaApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(JavaApiApplication.class, args);
    }
}
