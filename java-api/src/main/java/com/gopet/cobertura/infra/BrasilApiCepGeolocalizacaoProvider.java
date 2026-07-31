package com.gopet.cobertura.infra;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.Coordenadas;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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
            throw new CepNaoEncontradoException(cep);
        }

        if (resposta == null || resposta.location() == null || resposta.location().coordinates() == null) {
            throw new CepNaoEncontradoException(cep);
        }

        Coordinates coordinates = resposta.location().coordinates();
        try {
            double latitude = Double.parseDouble(coordinates.latitude());
            double longitude = Double.parseDouble(coordinates.longitude());
            return new Coordenadas(latitude, longitude);
        } catch (NullPointerException | NumberFormatException e) {
            throw new CepNaoEncontradoException(cep);
        }
    }

    private record BrasilApiCepResponse(Location location) {
    }

    private record Location(Coordinates coordinates) {
    }

    private record Coordinates(String longitude, String latitude) {
    }
}
