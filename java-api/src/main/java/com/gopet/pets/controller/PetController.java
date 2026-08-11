package com.gopet.pets.controller;

import com.gopet.pets.application.PetService;
import com.gopet.pets.domain.Pet;
import com.gopet.pets.domain.PetRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Pets do tutor logado — um tutor pode cadastrar mais de um. Com Auth0 configurado (ver
 * SecurityConfig), exige token e usa o "sub" como tutor_id; {@code tutor_id} no corpo/query só
 * vale sem Auth0 configurado (modo demo), mesma convenção do ReservaController.
 */
@RestController
@RequestMapping("/pets")
public class PetController {

    private final PetService petService;

    public PetController(PetService petService) {
        this.petService = petService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(@RequestParam(value = "tutor_id", required = false) String tutorIdFallback,
                                                        @AuthenticationPrincipal Jwt jwt) {
        String tutorId = jwt != null ? jwt.getSubject() : tutorIdFallback;
        List<Pet> pets = petService.listar(tutorId);
        return ResponseEntity.ok(Map.of("pets", pets));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@Valid @RequestBody PetRequest req, @AuthenticationPrincipal Jwt jwt) {
        String tutorId = jwt != null ? jwt.getSubject() : req.tutorId();
        Pet pet = petService.criar(req, tutorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("pet", pet));
    }
}
