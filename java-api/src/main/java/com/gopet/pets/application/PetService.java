package com.gopet.pets.application;

import com.gopet.pets.domain.Pet;
import com.gopet.pets.domain.PetRequest;
import com.gopet.pets.domain.PetStore;
import com.gopet.pets.domain.Porte;
import com.gopet.reservas.domain.ReservaException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PetService {

    private final PetStore store;

    public PetService(PetStore store) {
        this.store = store;
    }

    /** @param tutorIdAutenticado "sub" do token Auth0 validado, ou tutor_id de fallback em modo demo/sem Auth0. */
    public List<Pet> listar(String tutorIdAutenticado) {
        if (isBlank(tutorIdAutenticado))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Não foi possível identificar o usuário.");
        if (!store.configurado()) return List.of();

        return store.listarPorTutor(tutorIdAutenticado).stream().map(PetService::paraPet).collect(Collectors.toList());
    }

    public Pet criar(PetRequest req, String tutorIdAutenticado) {
        if (isBlank(tutorIdAutenticado))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Não foi possível identificar o usuário.");

        String id = UUID.randomUUID().toString();
        Pet pet = new Pet(id, req.nome(), req.idadeAnos(), req.porte(), req.pesoKg(), req.reativo(),
                req.agressivoComPessoas(), req.vacinasEmDia(), req.problemaSaude(), req.observacoes());

        if (!store.configurado()) return pet;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("tutor_id", tutorIdAutenticado);
        row.put("nome", req.nome());
        row.put("idade_anos", req.idadeAnos());
        row.put("porte", req.porte().codigo());
        row.put("peso_kg", req.pesoKg());
        row.put("reativo", req.reativo());
        row.put("agressivo_pessoas", req.agressivoComPessoas());
        row.put("vacinas_em_dia", req.vacinasEmDia());
        row.put("restricoes_saude", req.problemaSaude());
        row.put("observacoes", req.observacoes());

        try {
            store.inserir(row);
        } catch (Exception e) {
            throw new ReservaException(HttpStatus.INTERNAL_SERVER_ERROR, "DB_ERROR",
                    "Não conseguimos salvar o pet. Nosso time já foi avisado.");
        }

        return pet;
    }

    private static Pet paraPet(Map<String, Object> row) {
        Object idade = row.get("idade_anos");
        Object peso = row.get("peso_kg");
        return new Pet(
                String.valueOf(row.get("id")),
                (String) row.get("nome"),
                idade == null ? 0 : ((Number) idade).intValue(),
                Porte.deCodigo(String.valueOf(row.get("porte"))),
                peso == null ? null : ((Number) peso).doubleValue(),
                Boolean.TRUE.equals(row.get("reativo")),
                Boolean.TRUE.equals(row.get("agressivo_pessoas")),
                Boolean.TRUE.equals(row.get("vacinas_em_dia")),
                (String) row.get("restricoes_saude"),
                (String) row.get("observacoes")
        );
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
