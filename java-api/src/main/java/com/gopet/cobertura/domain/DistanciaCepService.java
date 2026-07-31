package com.gopet.cobertura.domain;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DistanciaCepService {

    private static final double RAIO_TERRA_KM = 6371;

    private final CepGeolocalizacaoProvider cepGeolocalizacaoProvider;
    private final String cepBase;
    private final double raioAtendimentoKm;

    public DistanciaCepService(CepGeolocalizacaoProvider cepGeolocalizacaoProvider,
                                @Value("${cobertura.cep-base}") String cepBase,
                                @Value("${cobertura.raio-km}") double raioAtendimentoKm) {
        this.cepGeolocalizacaoProvider = cepGeolocalizacaoProvider;
        this.cepBase = cepBase;
        this.raioAtendimentoKm = raioAtendimentoKm;
    }

    public CoberturaResultado verificar(String cep) {
        String cepLimpo = cep == null ? "" : cep.replaceAll("\\D", "");
        if (cepLimpo.length() != 8) {
            return CoberturaResultado.invalido();
        }

        try {
            Coordenadas origem = cepGeolocalizacaoProvider.buscarCoordenadas(cepBase);
            Coordenadas destino = cepGeolocalizacaoProvider.buscarCoordenadas(cepLimpo);
            double distanciaKm = calcularDistanciaKm(origem, destino);

            return CoberturaResultado.calculado(distanciaKm, distanciaKm <= raioAtendimentoKm);
        } catch (CepNaoEncontradoException e) {
            return CoberturaResultado.falha("CEP_NAO_ENCONTRADO");
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
