package com.gopet.reservas.application;

import com.gopet.cobertura.application.DistanciaCepService;
import com.gopet.cobertura.domain.CoberturaResultado;
import com.gopet.reservas.domain.EnderecoRequest;
import com.gopet.reservas.domain.ReservaException;
import com.gopet.reservas.domain.ReservaIdempotenteException;
import com.gopet.reservas.domain.ReservaRequest;
import com.gopet.reservas.domain.ReservaStore;
import com.gopet.whatsapp.application.ReservaConfirmacaoService;
import com.gopet.whatsapp.domain.WhatsappProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservaServiceTest {

    @Mock
    WhatsappProvider whatsappProvider;
    @Mock
    DistanciaCepService distanciaCepService;
    @Mock
    ReservaStore store;

    ReservaService service;

    @BeforeEach
    void setUp() {
        service = new ReservaService(new ReservaConfirmacaoService(whatsappProvider), distanciaCepService, store);
    }

    private static ReservaRequest requestValido() {
        return new ReservaRequest("passeio_30", "Amanhã", "08:30", false,
                new EnderecoRequest("04321-000", "123", ""), "11912345678", null);
    }

    @Test
    void criar_dadosValidosSemPersistencia_enviaConfirmacaoERetornaReservaNova() {
        when(distanciaCepService.verificar("04321000")).thenReturn(CoberturaResultado.calculado(1.0, true));
        when(store.configurado()).thenReturn(false);

        var resultado = service.criar(requestValido(), "idem-1", null);

        assertThat(resultado.novo()).isTrue();
        assertThat(resultado.reserva().precoTotalCentavos()).isEqualTo(3500);
        assertThat(resultado.reserva().status()).isEqualTo("confirmada");
        verify(whatsappProvider).enviarTexto(anyString(), anyString());
        verify(store, org.mockito.Mockito.never()).inserir(org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void criar_doisPets_aplicaAcrescimoDe60Porcento() {
        when(distanciaCepService.verificar("04321000")).thenReturn(CoberturaResultado.calculado(1.0, true));
        when(store.configurado()).thenReturn(false);
        var req = new ReservaRequest("passeio_30", "Amanhã", "08:30", true,
                new EnderecoRequest("04321-000", "123", ""), "11912345678", null);

        var resultado = service.criar(req, "idem-2", null);

        assertThat(resultado.reserva().precoTotalCentavos()).isEqualTo(5600); // 3500 * 1.6
    }

    @Test
    void criar_foraDaCobertura_lancaErroSemEnviarConfirmacao() {
        when(distanciaCepService.verificar("04321000")).thenReturn(CoberturaResultado.calculado(50.0, false));

        assertThatThrownBy(() -> service.criar(requestValido(), "idem-3", null))
                .isInstanceOfSatisfying(ReservaException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                    assertThat(e.getCode()).isEqualTo("FORA_DA_COBERTURA");
                });
        verifyNoInteractions(whatsappProvider);
    }

    @Test
    void criar_semIdempotencyKey_lancaErroDeValidacao() {
        assertThatThrownBy(() -> service.criar(requestValido(), null, null))
                .isInstanceOfSatisfying(ReservaException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(e.getCode()).isEqualTo("VALIDATION_ERROR");
                });
        verifyNoInteractions(distanciaCepService, whatsappProvider);
    }

    @Test
    void criar_servicoInvalido_lancaErroDeValidacao() {
        var req = new ReservaRequest("inexistente", "Amanhã", "08:30", false,
                new EnderecoRequest("04321-000", "123", ""), "11912345678", null);

        assertThatThrownBy(() -> service.criar(req, "idem-4", null))
                .isInstanceOfSatisfying(ReservaException.class, e ->
                        assertThat(e.getCode()).isEqualTo("VALIDATION_ERROR"));
        verifyNoInteractions(distanciaCepService);
    }

    @Test
    void criar_reservaJaExistentePorIdempotencia_retornaReservaSemStatusNovo() {
        when(distanciaCepService.verificar("04321000")).thenReturn(CoberturaResultado.calculado(1.0, true));
        when(store.configurado()).thenReturn(true);
        org.mockito.Mockito.doThrow(new ReservaIdempotenteException()).when(store).inserir(org.mockito.ArgumentMatchers.anyMap());

        var resultado = service.criar(requestValido(), "idem-repetida", null);

        assertThat(resultado.novo()).isFalse();
    }

    @Test
    void criar_erroAoPersistir_lancaErroDeBancoDeDados() {
        when(distanciaCepService.verificar("04321000")).thenReturn(CoberturaResultado.calculado(1.0, true));
        when(store.configurado()).thenReturn(true);
        org.mockito.Mockito.doThrow(new RuntimeException("timeout")).when(store).inserir(org.mockito.ArgumentMatchers.anyMap());

        assertThatThrownBy(() -> service.criar(requestValido(), "idem-6", null))
                .isInstanceOfSatisfying(ReservaException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                    assertThat(e.getCode()).isEqualTo("DB_ERROR");
                });
    }

    @Test
    void criar_comTutorIdAutenticado_usaEleEmVezDoTutorIdDoCorpo() {
        when(distanciaCepService.verificar("04321000")).thenReturn(CoberturaResultado.calculado(1.0, true));
        when(store.configurado()).thenReturn(true);
        var req = new ReservaRequest("passeio_30", "Amanhã", "08:30", false,
                new EnderecoRequest("04321-000", "123", ""), "11912345678", "tutor-do-corpo-nao-confiavel");

        service.criar(req, "idem-auth", "auth0|sub-real");

        var captor = org.mockito.ArgumentCaptor.forClass(java.util.Map.class);
        verify(store).inserir(captor.capture());
        assertThat(captor.getValue().get("tutor_id")).isEqualTo("auth0|sub-real");
    }
}
