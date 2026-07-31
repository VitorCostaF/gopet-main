package com.gopet.cobertura.controller;

import com.gopet.cobertura.domain.CoberturaResultado;

public record CoberturaResponse(boolean atende, Double distanciaKm, String motivo) {

    public static CoberturaResponse de(CoberturaResultado resultado) {
        return new CoberturaResponse(resultado.atende(), resultado.distanciaKm(), resultado.motivo());
    }
}
