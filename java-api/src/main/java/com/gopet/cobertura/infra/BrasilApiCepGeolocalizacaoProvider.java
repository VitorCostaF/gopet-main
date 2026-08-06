package com.gopet.cobertura.infra;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.Coordenadas;
import com.gopet.cobertura.infra.brasilapi.BrasilApiCepResponse;
import com.gopet.cobertura.infra.brasilapi.Coordinates;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class BrasilApiCepGeolocalizacaoProvider implements CepGeolocalizacaoProvider {

    private final RestClient restClient = RestClient.create("https://brasilapi.com.br/api/cep/v2");

    @Override
    public Coordenadas buscarCoordenadas(String cep) {
        BrasilApiCepResponse resposta;
        try {
            resposta = restClient.get()
                    .uri("/{cep}", cep)
                    .retrieve()
                    .body(BrasilApiCepResponse.class);
        } catch (Exception e) {
            log.error("Falha ao consultar a BrasilAPI para o CEP {}", cep, e);
            throw new CepNaoEncontradoException(cep);
        }

        if (resposta == null || resposta.location() == null || resposta.location().coordinates() == null) {
            log.error("BrasilAPI não retornou coordenadas para o CEP {}", cep);
            throw new CepNaoEncontradoException(cep);
        }

        Coordinates coordinates = resposta.location().coordinates();
        try {
            double latitude = Double.parseDouble(coordinates.latitude());
            double longitude = Double.parseDouble(coordinates.longitude());
            return new Coordenadas(latitude, longitude);
        } catch (NullPointerException | NumberFormatException e) {
            log.error("Coordenadas inválidas retornadas pela BrasilAPI para o CEP {}: latitude={}, longitude={}",
                    cep, coordinates.latitude(), coordinates.longitude(), e);
            throw new CepNaoEncontradoException(cep);
        }
    }
}
