package com.gopet.cobertura.domain;

/** Porta única do adaptador de geolocalização por CEP — troque a implementação (infra) quando o provider mudar. */
public interface CepGeolocalizacaoProvider {
    Coordenadas buscarCoordenadas(String cep);
}
