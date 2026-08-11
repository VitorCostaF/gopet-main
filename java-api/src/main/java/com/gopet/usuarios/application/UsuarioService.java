package com.gopet.usuarios.application;

import com.gopet.reservas.domain.EnderecoRequest;
import com.gopet.reservas.domain.ReservaException;
import com.gopet.usuarios.domain.Usuario;
import com.gopet.usuarios.domain.UsuarioRequest;
import com.gopet.usuarios.domain.UsuarioStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioStore store;

    public UsuarioService(UsuarioStore store) {
        this.store = store;
    }

    /**
     * @param idAutenticado "sub" do token Auth0 validado, ou o tutor_id de fallback em modo
     *                      demo/sem Auth0 (ver UsuarioController). Nunca vazio — o controller
     *                      já valida isso antes de chamar o service.
     * @throws ReservaException 404 USUARIO_NAO_CADASTRADO se o tutor ainda não completou o cadastro —
     *                           é assim que o front-end (ver app/minha-conta) decide mostrar o alerta.
     */
    public Usuario buscar(String idAutenticado) {
        if (!store.configurado())
            return new Usuario(idAutenticado, "", "", null, false);

        return store.buscarPorId(idAutenticado)
                .map(UsuarioService::paraUsuario)
                .orElseThrow(() -> new ReservaException(HttpStatus.NOT_FOUND, "USUARIO_NAO_CADASTRADO",
                        "Finalize seu cadastro antes de continuar."));
    }

    /** Como {@link #buscar}, mas devolve cadastro vazio (em vez de 404) quando não existe ainda — usado internamente por quem só precisa checar se está completo. */
    public Optional<Usuario> buscarOpcional(String idAutenticado) {
        if (!store.configurado()) return Optional.of(new Usuario(idAutenticado, "", "", null, false));
        return store.buscarPorId(idAutenticado).map(UsuarioService::paraUsuario);
    }

    public Usuario salvar(UsuarioRequest req, String idAutenticado) {
        if (isBlank(idAutenticado))
            throw new ReservaException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Não foi possível identificar o usuário.");

        Usuario usuario = new Usuario(idAutenticado, req.nome(), req.email(), req.endereco(),
                Usuario.completo(req.nome(), req.endereco()));

        if (!store.configurado()) return usuario;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", idAutenticado);
        row.put("nome", req.nome());
        row.put("email", req.email());
        row.put("endereco_padrao", Map.of(
                "cep", req.endereco().cep(),
                "numero", req.endereco().numero(),
                "instrucoes", req.endereco().instrucoes() == null ? "" : req.endereco().instrucoes()
        ));
        row.put("updated_at", Instant.now().toString());

        try {
            store.salvar(row);
        } catch (Exception e) {
            throw new ReservaException(HttpStatus.INTERNAL_SERVER_ERROR, "DB_ERROR",
                    "Não conseguimos salvar seu cadastro. Nosso time já foi avisado.");
        }

        return usuario;
    }

    @SuppressWarnings("unchecked")
    private static Usuario paraUsuario(Map<String, Object> row) {
        String nome = (String) row.getOrDefault("nome", "");
        Object enderecoRaw = row.get("endereco_padrao");
        EnderecoRequest endereco = null;
        if (enderecoRaw instanceof Map<?, ?> m) {
            Map<String, Object> mapa = (Map<String, Object>) m;
            endereco = new EnderecoRequest((String) mapa.get("cep"), (String) mapa.get("numero"), (String) mapa.get("instrucoes"));
        }
        return new Usuario((String) row.get("id"), nome, (String) row.get("email"), endereco,
                Usuario.completo(nome, endereco));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
