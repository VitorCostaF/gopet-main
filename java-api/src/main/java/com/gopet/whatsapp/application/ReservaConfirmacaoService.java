package com.gopet.whatsapp.application;

import com.gopet.whatsapp.domain.ConfirmacaoReservaRequest;
import com.gopet.whatsapp.domain.EnvioResponse;
import com.gopet.whatsapp.domain.WhatsappProvider;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ReservaConfirmacaoService {

    private static final Map<String, String> NOMES_SERVICO = Map.of(
            "passeio_30", "Passeio 30 min",
            "passeio_60", "Passeio 60 min",
            "creche_dia", "Creche (dia)"
    );

    private final WhatsappProvider whatsappProvider;

    public ReservaConfirmacaoService(WhatsappProvider whatsappProvider) {
        this.whatsappProvider = whatsappProvider;
    }

    public EnvioResponse confirmar(ConfirmacaoReservaRequest req) {
        String whatsappLimpo = req.whatsapp() == null ? "" : req.whatsapp().replaceAll("\\D", "");
        if (whatsappLimpo.length() < 10 || whatsappLimpo.length() > 11) {
            return EnvioResponse.falha("WHATSAPP_INVALIDO");
        }
        String telefone = whatsappLimpo.startsWith("55") ? whatsappLimpo : "55" + whatsappLimpo;
        String nomeServico = NOMES_SERVICO.getOrDefault(req.servico(), req.servico());
        String mensagem = """
                Olá! 🐾 Sua reserva na GO PET foi confirmada.
                Serviço: %s
                Quando: %s às %s
                Endereço: CEP %s, nº %s
                Qualquer dúvida, é só responder por aqui.""".formatted(
                nomeServico, req.dia(), req.hora(), req.cep(), req.numero());

        try {
            whatsappProvider.enviarTexto(telefone, mensagem);
            return EnvioResponse.ok();
        } catch (Exception e) {
            return EnvioResponse.falha("PROVIDER_ERRO");
        }
    }
}
