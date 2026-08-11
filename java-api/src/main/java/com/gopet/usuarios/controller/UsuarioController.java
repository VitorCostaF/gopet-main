package com.gopet.usuarios.controller;

import com.gopet.usuarios.application.UsuarioService;
import com.gopet.usuarios.domain.Usuario;
import com.gopet.usuarios.domain.UsuarioRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Cadastro do tutor logado. Com Auth0 configurado (ver SecurityConfig), exige token e usa o
 * "sub" como id — o parâmetro {@code tutor_id} só é considerado sem Auth0 configurado (modo
 * demo), mesma convenção do ReservaController.
 */
@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> buscar(@RequestParam(value = "tutor_id", required = false) String tutorIdFallback,
                                                        @AuthenticationPrincipal Jwt jwt) {
        String id = jwt != null ? jwt.getSubject() : tutorIdFallback;
        Usuario usuario = usuarioService.buscar(id);
        return ResponseEntity.ok(Map.of("usuario", usuario));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> salvar(@Valid @RequestBody UsuarioRequest req,
                                                        @AuthenticationPrincipal Jwt jwt) {
        String idAutenticado = jwt != null ? jwt.getSubject() : req.tutorId();
        Usuario usuario = usuarioService.salvar(req, idAutenticado);
        return ResponseEntity.ok(Map.of("usuario", usuario));
    }
}
