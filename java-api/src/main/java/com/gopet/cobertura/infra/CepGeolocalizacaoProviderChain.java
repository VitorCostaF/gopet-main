package com.gopet.cobertura.infra;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.Coordenadas;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * Chain of Responsibility: tenta cada {@link CepGeolocalizacaoProvider} na ordem recebida,
 * passando para o próximo somente quando o atual não conseguir localizar o CEP
 * (lança {@link CepNaoEncontradoException}). Só falha de fato quando nenhum provider resolve.
 * <p>
 * A ordem e a lista de providers são montadas em {@link CepGeolocalizacaoConfig} — para incluir
 * um novo provider na cadeia, basta adicioná-lo lá, sem alterar esta classe (OCP).
 */
@Slf4j
public class CepGeolocalizacaoProviderChain implements CepGeolocalizacaoProvider {

    private final List<CepGeolocalizacaoProvider> providers;

    public CepGeolocalizacaoProviderChain(List<CepGeolocalizacaoProvider> providers) {
        this.providers = List.copyOf(providers);
    }

    @Override
    public Coordenadas buscarCoordenadas(String cep) {
        for (CepGeolocalizacaoProvider provider : providers) {
            try {
                return provider.buscarCoordenadas(cep);
            } catch (CepNaoEncontradoException e) {
                log.debug("{} não localizou o CEP {}, tentando próximo provider da cadeia",
                        provider.getClass().getSimpleName(), cep);
            }
        }

        log.error("Nenhum provider da cadeia conseguiu localizar coordenadas para o CEP {}", cep);
        throw new CepNaoEncontradoException(cep);
    }
}
