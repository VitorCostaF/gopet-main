package com.gopet.whatsapp;

/** Interface única do adaptador de envio — troque a implementação quando o provider mudar. */
public interface WhatsappProvider {
    void enviarTexto(String telefoneE164, String mensagem);
}
