package com.gopet.whatsapp.domain;

/** Porta única do adaptador de envio — troque a implementação (infra) quando o provider mudar. */
public interface WhatsappProvider {
    void enviarTexto(String telefoneE164, String mensagem);
}
