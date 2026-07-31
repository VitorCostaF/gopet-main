package com.gopet.whatsapp.application;

import com.gopet.whatsapp.domain.ConfirmacaoReservaRequest;
import com.gopet.whatsapp.domain.WhatsappProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservaConfirmacaoServiceTest {

    @Mock
    WhatsappProvider whatsappProvider;

    @Test
    void confirmar_whatsappValido_enviaMensagemComDadosDaReserva() {
        var service = new ReservaConfirmacaoService(whatsappProvider);
        var req = new ConfirmacaoReservaRequest("passeio_30", "Amanhã", "08:30", "04321000", "123", "(11) 91234-5678");

        var resposta = service.confirmar(req);

        assertThat(resposta.enviado()).isTrue();
        verify(whatsappProvider).enviarTexto(eq("5511912345678"), contains("Passeio 30 min"));
    }

    @Test
    void confirmar_whatsappComDddApenas9Digitos_completaComCodigoDoPais() {
        var service = new ReservaConfirmacaoService(whatsappProvider);
        var req = new ConfirmacaoReservaRequest("creche_dia", "Sáb", "09:00", "04321000", "45", "11987654321");

        service.confirmar(req);

        verify(whatsappProvider).enviarTexto(eq("5511987654321"), contains("Creche (dia)"));
    }

    @Test
    void confirmar_whatsappInvalido_naoEnviaERetornaFalha() {
        var service = new ReservaConfirmacaoService(whatsappProvider);
        var req = new ConfirmacaoReservaRequest("passeio_30", "Amanhã", "08:30", "04321000", "123", "123");

        var resposta = service.confirmar(req);

        assertThat(resposta.enviado()).isFalse();
        assertThat(resposta.motivo()).isEqualTo("WHATSAPP_INVALIDO");
        verifyNoInteractions(whatsappProvider);
    }

    @Test
    void confirmar_providerLancaExcecao_retornaFalhaSemPropagar() {
        var service = new ReservaConfirmacaoService(whatsappProvider);
        doThrow(new IllegalStateException("Z-API não configurada")).when(whatsappProvider).enviarTexto(anyString(), anyString());
        var req = new ConfirmacaoReservaRequest("passeio_30", "Amanhã", "08:30", "04321000", "123", "11912345678");

        var resposta = service.confirmar(req);

        assertThat(resposta.enviado()).isFalse();
        assertThat(resposta.motivo()).isEqualTo("PROVIDER_ERRO");
    }
}
