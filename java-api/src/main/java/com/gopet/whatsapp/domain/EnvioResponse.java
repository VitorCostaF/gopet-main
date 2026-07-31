package com.gopet.whatsapp.domain;

public record EnvioResponse(boolean enviado, String motivo) {

    public static EnvioResponse ok() {
        return new EnvioResponse(true, null);
    }

    public static EnvioResponse falha(String motivo) {
        return new EnvioResponse(false, motivo);
    }
}
