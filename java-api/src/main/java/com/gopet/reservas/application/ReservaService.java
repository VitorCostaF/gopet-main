package com.gopet.reservas.application;

import com.gopet.cobertura.application.DistanciaCepService;
import com.gopet.cobertura.domain.CoberturaResultado;
import com.gopet.pets.domain.PetStore;
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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final PetStore petStore;

    public ReservaService(ReservaConfirmacaoService confirmacaoService, DistanciaCepService distanciaCepService,
                           ReservaStore store, PetStore petStore) {
        this.confirmacaoService = confirmacaoService;
        this.distanciaCepService = distanciaCepService;
        this.store = store;
        this.petStore = petStore;
    }

    /**
     * @param tutorIdAutenticado "sub" do token Auth0 validado (ver SecurityConfig/ReservaController),
     *                           ou null quando não há Auth0 configurado/token. Quando presente, é
     *                           SEMPRE usado no lugar de {@code req.tutorId()} — o valor do corpo
     *                           não é confiável (o cliente pode mandar qualquer id).
     */
    public ReservaResultado criar(ReservaRequest req, String idempotencyKey, String tutorIdAutenticado) {
        if (isBlank(idempotencyKey))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Header Idempotency-Key é obrigatório.");

        Integer preco = PRECOS.get(req.servico());
        if (preco == null)
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Serviço inválido ou indisponível.");

        String cep = validarCep(req.endereco().cep());

        String whatsapp = digits(req.whatsapp());
        String tutorId = tutorIdAutenticado != null ? tutorIdAutenticado : req.tutorId();

        validarPetsDoTutor(req.petIds(), tutorId);

        int total = (int) Math.round(preco * (req.doisPets() ? 1.6 : 1));
        String numero = req.endereco().numero();
        String instrucoes = req.endereco().instrucoes() == null ? "" : req.endereco().instrucoes();
        EnderecoRequest endereco = new EnderecoRequest(cep, numero, instrucoes);

        Reserva reserva = new Reserva(UUID.randomUUID().toString(), req.servico(), req.dia(), req.hora(),
                req.doisPets(), endereco, "confirmada", total, whatsapp, req.petIds());

        // Notificação best-effort — não impede a reserva de ser criada.
        confirmacaoService.confirmar(new ConfirmacaoReservaRequest(req.servico(), req.dia(), req.hora(), cep, numero, whatsapp));

        if (!store.configurado()) {
            return new ReservaResultado(reserva, true);
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", reserva.id());
        row.put("tutor_id", tutorId);
        row.put("servico", req.servico());
        row.put("inicio", Instant.now().toString()); // TODO: converter dia+hora reais no fechamento da agenda
        row.put("endereco", Map.of("cep", cep, "numero", numero, "instrucoes", instrucoes));
        row.put("status", reserva.status());
        row.put("preco_total_centavos", total);
        row.put("whatsapp", whatsapp);
        row.put("idempotency_key", idempotencyKey);

        try {
            store.inserir(row);
            store.vincularPets(reserva.id(), req.petIds());
        } catch (ReservaIdempotenteException e) {
            return new ReservaResultado(reserva, false);
        } catch (Exception e) {
            throw new ReservaException(HttpStatus.INTERNAL_SERVER_ERROR, "DB_ERROR",
                    "Não conseguimos salvar sua reserva. Nosso time já foi avisado.");
        }

        return new ReservaResultado(reserva, true);
    }

    /** @param tutorId "sub" do tutor autenticado — lista de reservas dele, mais recentes primeiro. */
    public List<Reserva> listar(String tutorId) {
        if (isBlank(tutorId))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Não foi possível identificar o usuário.");
        if (!store.configurado()) return List.of();

        return store.listarPorTutor(tutorId).stream().map(ReservaService::paraReserva).collect(Collectors.toList());
    }

    /** Recusa vincular pets que não existem ou não são do tutor (evita usar o id de pet de outra pessoa). */
    private void validarPetsDoTutor(List<String> petIds, String tutorId) {
        if (!petStore.configurado()) return; // sem persistência configurada (demo), não há como checar posse

        Set<String> petsDoTutor = petStore.listarPorTutor(tutorId).stream()
                .map(p -> String.valueOf(p.get("id")))
                .collect(Collectors.toSet());
        if (!petsDoTutor.containsAll(petIds))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Um ou mais pets não pertencem a este tutor.");
    }

    @SuppressWarnings("unchecked")
    private static Reserva paraReserva(Map<String, Object> row) {
        Map<String, Object> enderecoRaw = (Map<String, Object>) row.get("endereco");
        EnderecoRequest endereco = enderecoRaw == null ? null : new EnderecoRequest(
                (String) enderecoRaw.get("cep"), (String) enderecoRaw.get("numero"), (String) enderecoRaw.get("instrucoes"));
        Object precoRaw = row.get("preco_total_centavos");
        List<String> petIds = (List<String>) row.getOrDefault("pet_ids", List.of());

        return new Reserva(
                String.valueOf(row.get("id")),
                (String) row.get("servico"),
                null, null, // dia/hora "amigáveis" não são persistidos hoje (ver TODO em criar()); "inicio" tem o timestamp real
                false,
                endereco,
                (String) row.get("status"),
                precoRaw == null ? 0 : ((Number) precoRaw).intValue(),
                (String) row.get("whatsapp"),
                petIds
        );
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
