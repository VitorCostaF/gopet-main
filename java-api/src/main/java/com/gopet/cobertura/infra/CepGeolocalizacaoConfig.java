package com.gopet.cobertura.infra;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.infra.brasilapi.BrasilApiCepGeolocalizacaoProvider;
import com.gopet.cobertura.infra.geoapify.GeoapifyCepGeolocalizacaoProvider;
import com.gopet.cobertura.infra.nominatim.NominatimCepGeolocalizacaoProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.List;

/**
 * Monta a cadeia de providers de geolocalização por CEP, na ordem de prioridade:
 * BrasilAPI -> Geoapify -> Nominatim. Cada provider continua sendo um bean independente
 * (injetável isoladamente por tipo concreto, por exemplo em testes); o bean primário exposto
 * como {@link CepGeolocalizacaoProvider} é a cadeia, usada por {@code DistanciaCepService}.
 */
@Configuration
public class CepGeolocalizacaoConfig {

    @Bean
    @Primary
    public CepGeolocalizacaoProvider cepGeolocalizacaoProvider(
            GeoapifyCepGeolocalizacaoProvider geoapify,
            BrasilApiCepGeolocalizacaoProvider brasilApi,
            NominatimCepGeolocalizacaoProvider nominatim) {
        return new CepGeolocalizacaoProviderChain(List.of(geoapify, brasilApi , nominatim));
    }
}
