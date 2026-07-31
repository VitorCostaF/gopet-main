package com.gopet.cobertura.domain;

public record CoberturaResultado(boolean atende, Double distanciaKm, String motivo) {

    public static CoberturaResultado calculado(double distanciaKm, boolean atende) {
        return new CoberturaResultado(atende, distanciaKm, null);
    }

    public static CoberturaResultado invalido() {
        return new CoberturaResultado(false, null, "CEP_INVALIDO");
    }

    public static CoberturaResultado falha(String motivo) {
        return new CoberturaResultado(false, null, motivo);
    }
}
