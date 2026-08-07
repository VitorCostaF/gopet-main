package com.gopet.cobertura.infra.geoapify;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.Coordenadas;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Geocodifica o CEP via Geoapify — usado como fallback quando a BrasilAPI não tem coordenadas. */
@Slf4j
@Component
public class GeoapifyCepGeolocalizacaoProvider implements CepGeolocalizacaoProvider {

    private final RestClient restClient = RestClient.create("https://api.geoapify.com/v1/geocode/search");
    private final String apiKey;

    public GeoapifyCepGeolocalizacaoProvider(@Value("${cobertura.geoapify.api-key:}") String apiKey) {
        this.apiKey = apiKey;
    }

    @Override
    public Coordenadas buscarCoordenadas(String cep) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("Geoapify sem api-key configurada (cobertura.geoapify.api-key), pulando para o CEP {}", cep);
            throw new CepNaoEncontradoException(cep);
        }

        GeoapifyGeocodeResponse resposta;
        try {
            resposta = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .queryParam("postcode", cep)
                            .queryParam("country", "Brazil")
                            .queryParam("format", "json")
                            .queryParam("apiKey", apiKey)
                            .build())
                    .retrieve()
                    .body(GeoapifyGeocodeResponse.class);
        } catch (Exception e) {
            log.error("Falha ao consultar o Geoapify para o CEP {}", cep, e);
            throw new CepNaoEncontradoException(cep);
        }

        if (resposta == null || resposta.results() == null || resposta.results().isEmpty()) {
            log.error("Geoapify não retornou coordenadas para o CEP {}", cep);
            throw new CepNaoEncontradoException(cep);
        }

        GeoapifyResultado resultado = resposta.results().get(0);
        if (resultado.lat() == null || resultado.lon() == null) {
            log.error("Geoapify retornou resultado sem coordenadas para o CEP {}", cep);
            throw new CepNaoEncontradoException(cep);
        }

        return new Coordenadas(resultado.lat(), resultado.lon());
    }
}
