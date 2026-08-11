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
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReservaController.class)
@Import({SecurityConfig.class, WebConfig.class})
class ReservaControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    ReservaService reservaService;

    private String requestValidoJson() throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "servico", "passeio_30",
                "dia", "Amanhã",
                "hora", "08:30",
                "dois_pets", false,
                "endereco", Map.of("cep", "04321-000", "numero", "123", "instrucoes", ""),
                "whatsapp", "11912345678",
                "pet_ids", java.util.List.of("pet-1")
        ));
    }

    @Test
    void criar_semEndereco_retorna400ComErroDeValidacao() throws Exception {
        String json = """
                {"servico":"passeio_30","dia":"Amanhã","hora":"08:30","whatsapp":"11912345678","pet_ids":["pet-1"]}
                """;

        mockMvc.perform(post("/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "idem-1")
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Informe o endereço completo."));

        verifyNoInteractions(reservaService);
    }

    @Test
    void criar_whatsappInvalido_retorna400ComErroDeValidacao() throws Exception {
        String json = """
                {"servico":"passeio_30","dia":"Amanhã","hora":"08:30",
                 "endereco":{"cep":"04321-000","numero":"123"},"whatsapp":"123","pet_ids":["pet-1"]}
                """;

        mockMvc.perform(post("/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "idem-2")
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Informe um WhatsApp válido, com DDD."));

        verifyNoInteractions(reservaService);
    }

    @Test
    void criar_cepInvalido_retorna400ComErroDeValidacao() throws Exception {
        String json = """
                {"servico":"passeio_30","dia":"Amanhã","hora":"08:30",
                 "endereco":{"cep":"123","numero":"123"},"whatsapp":"11912345678","pet_ids":["pet-1"]}
                """;

        mockMvc.perform(post("/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "idem-3")
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("CEP inválido."));

        verifyNoInteractions(reservaService);
    }

    @Test
    void criar_dadosValidos_delegaParaOServico() throws Exception {
        Reserva reserva = new Reserva("id-1", "passeio_30", "Amanhã", "08:30", false,
                new EnderecoRequest("04321000", "123", ""), "confirmada", 3500, "11912345678", java.util.List.of("pet-1"));
        when(reservaService.criar(any(), anyString(), any())).thenReturn(new ReservaResultado(reserva, true));

        mockMvc.perform(post("/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "idem-4")
                        .content(requestValidoJson()))
                .andExpect(status().isCreated());

        verify(reservaService).criar(any(), anyString(), any());
    }
}
