package com.gopet.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

/**
 * Protege os endpoints que leem/gravam dados do tutor logado — {@code POST/GET /reservas},
 * {@code GET/PUT /usuarios/me}, {@code GET/POST /pets} — exigindo um access token válido do
 * Auth0 (Resource Server). Os controllers desses endpoints usam o "sub" do token como
 * tutor_id/usuario_id real em vez de confiar no valor enviado pelo corpo/query da requisição
 * (ver ReservaController, UsuarioController, PetController).
 * <p>
 * Sem {@code AUTH0_DOMAIN} configurado, roda em modo aberto (mesmo comportamento de antes desta
 * integração) — mesma convenção de "configurado()" usada em {@code SupabaseReservaStore},
 * {@code ZApiWhatsappProvider} etc.: a API sobe e funciona sem exigir Auth0 em dev/local.
 */
@Configuration
public class SecurityConfig {

    private final String domain;
    private final String audience;

    public SecurityConfig(@Value("${auth0.domain:}") String domain, @Value("${auth0.audience:}") String audience) {
        this.domain = domain;
        this.audience = audience;
    }

    /**
     * Devolve {@code null} (= nenhum bean disponível, ver {@code ObjectProvider} em
     * {@link #filterChain}) quando AUTH0_DOMAIN não está configurado — evita a descoberta OIDC
     * do Auth0 (que exige rede) nesse caso. Não dá pra usar {@code @ConditionalOnProperty} aqui:
     * {@code auth0.domain: ${AUTH0_DOMAIN:}} sempre resolve a propriedade (string vazia quando a
     * env var não existe), e {@code @ConditionalOnProperty} sem {@code havingValue} trata string
     * vazia como "presente" — o branco só pode ser detectado checando o valor em runtime.
     * Em teste, substitua por {@code @MockBean} pra não depender de rede/tenant real.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        if (domain.isBlank()) {
            return null;
        }
        String issuer = "https://" + domain + "/";
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(issuer).build();

        OAuth2TokenValidator<Jwt> comEmissor = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> comAudiencia = new JwtClaimValidator<List<String>>("aud",
                aud -> aud != null && aud.contains(audience));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(comEmissor, comAudiencia));

        return decoder;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource,
                                            ObjectProvider<JwtDecoder> jwtDecoderProvider) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        JwtDecoder jwtDecoder = jwtDecoderProvider.getIfAvailable();
        if (jwtDecoder == null) {
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }

        http.authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // preflight de CORS
                        .requestMatchers(HttpMethod.GET, "/cobertura").permitAll() // checagem de CEP acontece antes do login
                        .requestMatchers(HttpMethod.POST, "/reservas").authenticated()
                        .requestMatchers(HttpMethod.GET, "/reservas").authenticated()
                        .requestMatchers(HttpMethod.GET, "/usuarios/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/usuarios/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/pets").authenticated()
                        .requestMatchers(HttpMethod.POST, "/pets").authenticated()
                        .anyRequest().permitAll())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder)));

        return http.build();
    }
}
