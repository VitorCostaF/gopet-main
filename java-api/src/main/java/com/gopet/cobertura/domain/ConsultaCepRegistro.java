package com.gopet.cobertura.domain;

/** Registro de uma consulta de cobertura por CEP, para fins de histórico/auditoria (ver ConsultaCepStore). */
public record ConsultaCepRegistro(
        String cepConsultado,
        String cepBase,
        Double distanciaKm,
        double raioMaximoKm,
        boolean atende,
        String motivo) {
}
