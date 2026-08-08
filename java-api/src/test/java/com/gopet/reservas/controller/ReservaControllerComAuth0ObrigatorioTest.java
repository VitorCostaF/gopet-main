package com.gopet.reservas.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gopet.config.SecurityConfig;
import com.gopet.config.WebConfig;
import com.gopet.reservas.application.ReservaService;
import com.gopet.reservas.domain.EnderecoRequest;
import com.gopet.reservas.domain.Reserva;
import com.gopet.reservas.domain.ReservaResultado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Com AUTH0_DOMAIN configurado, POST /reservas passa a exigir um access token válido
 * (ver SecurityConfig) — testes separados de {@link ReservaControllerTest}, que roda sem Auth0
 * configurado (o padrão em dev/demo, onde o endpoint continua aberto).
 * <p>
 * {@code @MockBean JwtDecoder} evita que o SecurityConfig tente resolver o issuer via rede
 * (descoberta OIDC) durante a subida do contexto de teste — o token aqui é fabricado
 * diretamente pelo post-processor {@code jwt()}, sem passar pelo decoder de verdade.
 */
@WebMvcTest(ReservaController.class)
@Import({SecurityConfig.class, WebConfig.class})
@TestPropertySource(properties = {
        "auth0.domain=gopet-test.us.auth0.com",
        "auth0.audience=https://gopet-api-test"
})
class ReservaControllerComAuth0ObrigatorioTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    ReservaService reservaService;

    @MockBean
    JwtDecoder jwtDecoder;

    private String requestValidoJson() throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "servico", "passeio_30",
                "dia", "Amanhã",
                "hora", "08:30",
                "dois_pets", false,
                "endereco", Map.of("cep", "04321-000", "numero", "123", "instrucoes", ""),
                "whatsapp", "11912345678"
        ));
    }

    @Test
    void criar_semToken_retorna401() throws Exception {
        mockMvc.perform(post("/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "idem-1")
                        .content(requestValidoJson()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void criar_comTokenValido_usaSubDoTokenComoTutorId() throws Exception {
        Reserva reserva = new Reserva("id-1", "passeio_30", "Amanhã", "08:30", false,
                new EnderecoRequest("04321000", "123", ""), "confirmada", 3500, "11912345678");
        when(reservaService.criar(any(), anyString(), eq("auth0|abc123")))
                .thenReturn(new ReservaResultado(reserva, true));

        mockMvc.perform(post("/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "idem-2")
                        .content(requestValidoJson())
                        .with(jwt().jwt(j -> j.subject("auth0|abc123").claim("aud", "https://gopet-api-test"))))
                .andExpect(status().isCreated());

        verify(reservaService).criar(any(), anyString(), eq("auth0|abc123"));
    }
}
