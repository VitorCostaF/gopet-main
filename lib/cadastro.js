"use client";
// lib/cadastro.js — cadastro do tutor (nome + endereço) no java-api. Usado tanto pelo alerta em
// app/minha-conta quanto pelo bloqueio de reserva em app/reservar/[slug]/page.js: "ver" a própria
// conta é permitido sem cadastro completo, mas reservar exige (ver ReservaService no java-api,
// que hoje não recusa reservas sem cadastro — a checagem de UX fica aqui, no front-end).
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth";
import { buscarUsuario } from "@/lib/javaApi";

/**
 * @returns { usuario, carregando, completo } — `usuario` é null enquanto carrega ou se o tutor
 * ainda não tem cadastro; `completo` só é true com nome e endereço preenchidos (ver
 * Usuario.completo no java-api, espelhado aqui pro front-end não depender de round-trip extra).
 */
export function useCadastroTutor() {
  const { user, carregando: carregandoSessao } = useSession();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (carregandoSessao) return;
    if (!user) {
      setUsuario(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    buscarUsuario(user.id)
      .then((u) => { if (!cancelado) setUsuario(u); })
      .catch(() => { if (!cancelado) setUsuario(null); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [user, carregandoSessao]);

  const completo = Boolean(usuario?.nome && usuario?.endereco?.numero && usuario?.endereco?.cep);
  return { usuario, carregando: carregandoSessao || carregando, completo };
}
