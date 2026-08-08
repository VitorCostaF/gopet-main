package com.gopet.cobertura.application;

import com.gopet.cobertura.domain.CepGeolocalizacaoProvider;
import com.gopet.cobertura.domain.CepNaoEncontradoException;
import com.gopet.cobertura.domain.CoberturaResultado;
import com.gopet.cobertura.domain.ConsultaCepRegistro;
import com.gopet.cobertura.domain.ConsultaCepStore;
import com.gopet.cobertura.domain.Coordenadas;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DistanciaCepService {

    private static final double RAIO_TERRA_KM = 6371;

    private final CepGeolocalizacaoProvider cepGeolocalizacaoProvider;
    private final ConsultaCepStore consultaCepStore;
    private final String cepBase;
    private final double raioAtendimentoKm;

    public DistanciaCepService(CepGeolocalizacaoProvider cepGeolocalizacaoProvider,
            ConsultaCepStore consultaCepStore,
            @Value("${cobertura.cep-base}") String cepBase,
            @Value("${cobertura.raio-km}") double raioAtendimentoKm) {
        this.cepGeolocalizacaoProvider = cepGeolocalizacaoProvider;
        this.consultaCepStore = consultaCepStore;
        this.cepBase = cepBase;
        this.raioAtendimentoKm = raioAtendimentoKm;
    }

    public CoberturaResultado verificar(String cep) {
        log.debug("Verificando cobertura para o CEP solicitado: {}", cep);

        String cepLimpo = cep == null ? "" : cep.replaceAll("\\D", "");
        if (cepLimpo.length() != 8) {
            return CoberturaResultado.invalido();
        }

        try {
            Coordenadas origem = cepGeolocalizacaoProvider.buscarCoordenadas(cepBase);
            Coordenadas destino = cepGeolocalizacaoProvider.buscarCoordenadas(cepLimpo);
            double distanciaKm = calcularDistanciaKm(origem, destino);

            log.debug("Distância calculada para o CEP {}: {} km", cepLimpo, distanciaKm);

            CoberturaResultado resultado = CoberturaResultado.calculado(distanciaKm, distanciaKm <= raioAtendimentoKm);
            registrarConsulta(cepLimpo, resultado);
            return resultado;
        } catch (CepNaoEncontradoException e) {
            CoberturaResultado resultado = CoberturaResultado.falha("CEP_NAO_ENCONTRADO");
            registrarConsulta(cepLimpo, resultado);
            return resultado;
        }
    }

    /** Grava o histórico da consulta no MySQL — best-effort, nunca deve derrubar a resposta de /cobertura. */
    private void registrarConsulta(String cepConsultado, CoberturaResultado resultado) {
        if (!consultaCepStore.configurado()) {
            return;
        }
        try {
            consultaCepStore.salvar(new ConsultaCepRegistro(cepConsultado, cepBase, resultado.distanciaKm(),
                    raioAtendimentoKm, resultado.atende(), resultado.motivo()));
        } catch (Exception e) {
            log.warn("Falha ao salvar histórico de consulta do CEP {}: {}", cepConsultado, e.getMessage());
        }
    }

    private double calcularDistanciaKm(Coordenadas origem, Coordenadas destino) {
        double deltaLatitude = Math.toRadians(destino.latitude() - origem.latitude());
        double deltaLongitude = Math.toRadians(destino.longitude() - origem.longitude());

        double a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2)
                + Math.cos(Math.toRadians(origem.latitude())) * Math.cos(Math.toRadians(destino.latitude()))
                        * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return RAIO_TERRA_KM * c;
    }
}
