package com.gopet.cobertura.infra.nominatim;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.Coordenadas;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * Geocodifica o CEP via Nominatim (OpenStreetMap) — último fallback da cadeia.
 * O User-Agent é obrigatório pela política de uso do serviço público do Nominatim.
 */
@Slf4j
@Component
public class NominatimCepGeolocalizacaoProvider implements CepGeolocalizacaoProvider {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("https://nominatim.openstreetmap.org/search")
            .defaultHeader("User-Agent", "GoPet/1.0 (contato@gopet.com.br)")
            .build();

    @Override
    public Coordenadas buscarCoordenadas(String cep) {
        List<NominatimResultado> resposta;
        try {
            resposta = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .queryParam("postalcode", cep)
                            .queryParam("country", "Brazil")
                            .queryParam("format", "json")
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<NominatimResultado>>() {
                    });
        } catch (Exception e) {
            log.error("Falha ao consultar o Nominatim para o CEP {}", cep, e);
            throw new CepNaoEncontradoException(cep);
        }

        if (resposta == null || resposta.isEmpty()) {
            log.error("Nominatim não retornou coordenadas para o CEP {}", cep);
            throw new CepNaoEncontradoException(cep);
        }

        NominatimResultado resultado = resposta.get(0);
        try {
            double latitude = Double.parseDouble(resultado.lat());
            double longitude = Double.parseDouble(resultado.lon());
            return new Coordenadas(latitude, longitude);
        } catch (NullPointerException | NumberFormatException e) {
            log.error("Nominatim retornou coordenadas inválidas para o CEP {}: lat={}, lon={}",
                    cep, resultado.lat(), resultado.lon(), e);
            throw new CepNaoEncontradoException(cep);
        }
    }
}
