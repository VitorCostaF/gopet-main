package com.gopet.reservas.application;

import com.gopet.cobertura.application.DistanciaCepService;
import com.gopet.cobertura.domain.CoberturaResultado;
import com.gopet.reservas.domain.EnderecoRequest;
import com.gopet.reservas.domain.Reserva;
import com.gopet.reservas.domain.ReservaException;
import com.gopet.reservas.domain.ReservaIdempotenteException;
import com.gopet.reservas.domain.ReservaRequest;
import com.gopet.reservas.domain.ReservaResultado;
import com.gopet.reservas.domain.ReservaStore;
import com.gopet.whatsapp.application.ReservaConfirmacaoService;
import com.gopet.whatsapp.domain.ConfirmacaoReservaRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ReservaService {

    private static final Map<String, Integer> PRECOS = Map.of(
            "passeio_30", 3500,
            "passeio_60", 5500,
            "creche_dia", 9000
    );

    private final ReservaConfirmacaoService confirmacaoService;
    private final DistanciaCepService distanciaCepService;
    private final ReservaStore store;

    public ReservaService(ReservaConfirmacaoService confirmacaoService, DistanciaCepService distanciaCepService,
                           ReservaStore store) {
        this.confirmacaoService = confirmacaoService;
        this.distanciaCepService = distanciaCepService;
        this.store = store;
    }

    public ReservaResultado criar(ReservaRequest req, String idempotencyKey) {
        if (isBlank(idempotencyKey))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Header Idempotency-Key é obrigatório.");

        Integer preco = PRECOS.get(req.servico());
        if (preco == null)
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Serviço inválido ou indisponível.");

        String cep = validarCep(req.endereco().cep());

        String whatsapp = digits(req.whatsapp());

        int total = (int) Math.round(preco * (req.doisPets() ? 1.6 : 1));
        String numero = req.endereco().numero();
        String instrucoes = req.endereco().instrucoes() == null ? "" : req.endereco().instrucoes();
        EnderecoRequest endereco = new EnderecoRequest(cep, numero, instrucoes);

        Reserva reserva = new Reserva(UUID.randomUUID().toString(), req.servico(), req.dia(), req.hora(),
                req.doisPets(), endereco, "confirmada", total, whatsapp);

        // Notificação best-effort — não impede a reserva de ser criada.
        confirmacaoService.confirmar(new ConfirmacaoReservaRequest(req.servico(), req.dia(), req.hora(), cep, numero, whatsapp));

        if (!store.configurado()) {
            return new ReservaResultado(reserva, true);
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", reserva.id());
        row.put("tutor_id", req.tutorId());
        row.put("servico", req.servico());
        row.put("inicio", Instant.now().toString()); // TODO: converter dia+hora reais no fechamento da agenda
        row.put("endereco", Map.of("cep", cep, "numero", numero, "instrucoes", instrucoes));
        row.put("status", reserva.status());
        row.put("preco_total_centavos", total);
        row.put("whatsapp", whatsapp);
        row.put("idempotency_key", idempotencyKey);

        try {
            store.inserir(row);
        } catch (ReservaIdempotenteException e) {
            return new ReservaResultado(reserva, false);
        } catch (Exception e) {
            throw new ReservaException(HttpStatus.INTERNAL_SERVER_ERROR, "DB_ERROR",
                    "Não conseguimos salvar sua reserva. Nosso time já foi avisado.");
        }

        return new ReservaResultado(reserva, true);
    }

    private String validarCep(String cepBruto) {
        String cep = digits(cepBruto);
        CoberturaResultado cobertura = distanciaCepService.verificar(cep);
        if ("CEP_INVALIDO".equals(cobertura.motivo()) || "CEP_NAO_ENCONTRADO".equals(cobertura.motivo()))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "CEP inválido.");
        if (!cobertura.atende())
            throw new ReservaException(HttpStatus.UNPROCESSABLE_ENTITY, "FORA_DA_COBERTURA", "Ainda não atendemos esse CEP.");
        return cep;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String digits(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }
}
