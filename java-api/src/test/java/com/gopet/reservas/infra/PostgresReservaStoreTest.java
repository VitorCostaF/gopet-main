package com.gopet.reservas.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gopet.reservas.domain.ReservaIdempotenteException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostgresReservaStoreTest {

    @Mock
    JdbcClient jdbcClient;

    JdbcClient.StatementSpec statementSpec;
    PostgresReservaStore store;

    @BeforeEach
    void setUp() {
        statementSpec = Mockito.mock(JdbcClient.StatementSpec.class, Mockito.RETURNS_SELF);
        store = new PostgresReservaStore(jdbcClient, new ObjectMapper());
    }

    private static Map<String, Object> reservaValida() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "11111111-1111-1111-1111-111111111111");
        row.put("tutor_id", null);
        row.put("servico", "passeio_30");
        row.put("inicio", "2026-08-01T10:00:00Z");
        row.put("endereco", Map.of("cep", "04321000", "numero", "123", "instrucoes", ""));
        row.put("status", "confirmada");
        row.put("preco_total_centavos", 3500);
        row.put("whatsapp", "5511912345678");
        row.put("idempotency_key", "idem-1");
        return row;
    }

    @Test
    void inserir_dadosValidos_vinculaParametrosEExecutaUpdate() {
        when(jdbcClient.sql(anyString())).thenReturn(statementSpec);

        store.inserir(reservaValida());

        verify(statementSpec).param("id", "11111111-1111-1111-1111-111111111111");
        verify(statementSpec).param("servico", "passeio_30");
        verify(statementSpec).param("precoTotalCentavos", 3500);
        verify(statementSpec).param("whatsapp", "5511912345678");
        verify(statementSpec).param("idempotencyKey", "idem-1");
        verify(statementSpec).param(org.mockito.ArgumentMatchers.eq("endereco"),
                org.mockito.ArgumentMatchers.contains("04321000"));
        verify(statementSpec).update();
    }

    @Test
    void inserir_violacaoDeChaveUnica_lancaReservaIdempotente() {
        when(jdbcClient.sql(anyString())).thenReturn(statementSpec);
        when(statementSpec.update()).thenThrow(new DuplicateKeyException("idx_reservas_idem"));

        assertThatThrownBy(() -> store.inserir(reservaValida()))
                .isInstanceOf(ReservaIdempotenteException.class);
    }

    @Test
    void configurado_retornaSempreVerdadeiro() {
        assertThat(store.configurado()).isTrue();
    }
}
