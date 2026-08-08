package com.gopet.cobertura.infra.mysql;

import com.gopet.cobertura.domain.ConsultaCepRegistro;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MySqlConsultaCepStoreTest {

    @Mock
    JdbcClient jdbcClient;

    JdbcClient.StatementSpec statementSpec;

    @BeforeEach
    void setUp() {
        statementSpec = Mockito.mock(JdbcClient.StatementSpec.class, Mockito.RETURNS_SELF);
    }

    @Test
    void salvar_registroValido_vinculaParametrosEExecutaUpdate() {
        var store = new MySqlConsultaCepStore(jdbcClient, "jdbc:mysql://localhost/gopet");
        when(jdbcClient.sql(anyString())).thenReturn(statementSpec);

        store.salvar(new ConsultaCepRegistro("04321001", "04321000", 0.3, 10, true, null));

        verify(statementSpec).param("cepConsultado", "04321001");
        verify(statementSpec).param("cepBase", "04321000");
        verify(statementSpec).param("distanciaKm", 0.3);
        verify(statementSpec).param("raioMaximoKm", 10.0);
        verify(statementSpec).param("atende", true);
        verify(statementSpec).param("motivo", null);
        verify(statementSpec).update();
    }

    @Test
    void configurado_comUrlDefinida_retornaVerdadeiro() {
        var store = new MySqlConsultaCepStore(jdbcClient, "jdbc:mysql://localhost/gopet");

        assertThat(store.configurado()).isTrue();
    }

    @Test
    void configurado_semUrl_retornaFalso() {
        var store = new MySqlConsultaCepStore(jdbcClient, "");

        assertThat(store.configurado()).isFalse();
    }
}
