package com.gopet.cobertura.application;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.Coordenadas;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DistanciaCepServiceTest {

    private static final String CEP_BASE = "04321000";

    @Mock
    CepGeolocalizacaoProvider cepGeolocalizacaoProvider;

    @Test
    void verificar_cepDentroDoRaio_retornaAtende() {
        var service = new DistanciaCepService(cepGeolocalizacaoProvider, CEP_BASE, 10);
        when(cepGeolocalizacaoProvider.buscarCoordenadas(CEP_BASE)).thenReturn(new Coordenadas(-23.6300, -46.6400));
        when(cepGeolocalizacaoProvider.buscarCoordenadas("04321001")).thenReturn(new Coordenadas(-23.6320, -46.6420));

        var resultado = service.verificar("04321-001");

        assertThat(resultado.atende()).isTrue();
        assertThat(resultado.distanciaKm()).isCloseTo(0.3, within(0.2));
        assertThat(resultado.motivo()).isNull();
    }

    @Test
    void verificar_cepForaDoRaio_retornaNaoAtende() {
        var service = new DistanciaCepService(cepGeolocalizacaoProvider, CEP_BASE, 5);
        when(cepGeolocalizacaoProvider.buscarCoordenadas(CEP_BASE)).thenReturn(new Coordenadas(-23.6300, -46.6400));
        when(cepGeolocalizacaoProvider.buscarCoordenadas("01310100")).thenReturn(new Coordenadas(-23.5610, -46.6560));

        var resultado = service.verificar("01310-100");

        assertThat(resultado.atende()).isFalse();
        assertThat(resultado.distanciaKm()).isGreaterThan(5);
    }

    @Test
    void verificar_cepComFormatoInvalido_naoConsultaProviderERetornaFalha() {
        var service = new DistanciaCepService(cepGeolocalizacaoProvider, CEP_BASE, 10);

        var resultado = service.verificar("123");

        assertThat(resultado.atende()).isFalse();
        assertThat(resultado.motivo()).isEqualTo("CEP_INVALIDO");
        verifyNoMoreInteractions(cepGeolocalizacaoProvider);
    }

    @Test
    void verificar_cepNaoEncontradoPeloProvider_retornaFalha() {
        var service = new DistanciaCepService(cepGeolocalizacaoProvider, CEP_BASE, 10);
        when(cepGeolocalizacaoProvider.buscarCoordenadas(CEP_BASE)).thenReturn(new Coordenadas(-23.6300, -46.6400));
        when(cepGeolocalizacaoProvider.buscarCoordenadas(eq("99999999"))).thenThrow(new CepNaoEncontradoException("99999999"));

        var resultado = service.verificar("99999-999");

        assertThat(resultado.atende()).isFalse();
        assertThat(resultado.motivo()).isEqualTo("CEP_NAO_ENCONTRADO");
    }
}
