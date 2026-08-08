import "./globals.css";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { NavConta } from "@/components/NavConta";

export const metadata = {
  title: "GO PET · Dog walker no Jabaquara | Passeio, creche e leva e traz",
  description:
    "Passeio de cães, creche e leva e traz no Jabaquara, Zona Sul de SP — com trajeto ao vivo, fotos em tempo real e ficha de portaria digital pro seu prédio.",
  openGraph: {
    title: "GO PET · Veja seu cão o tempo todo",
    description: "Dog walking com transparência total no Jabaquara.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Instrument+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "GO PET",
              description: "Dog walking, creche e hospedagem no Jabaquara, São Paulo.",
              areaServed: "Jabaquara, São Paulo, SP",
              priceRange: "R$35-R$120",
            }),
          }}
        />
      </head>
      <body style={{ background: "#F7F6F2", color: "#22271F", fontFamily: "'Instrument Sans',system-ui,sans-serif" }}>
        <nav
          className="sticky top-0 z-40 px-5 md:px-10 py-3 flex items-center justify-between"
          style={{ background: "#F7F6F2", borderBottom: "1px solid #DCE9DF" }}
        >
          <Link href="/" aria-label="GO PET — início" className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <Logo />
          </Link>
          <NavConta />
        </nav>
        {children}
        <footer className="px-5 py-8 text-center" style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#5A6157" }}>
          GO PET.dogwalker · Jabaquara, São Paulo
        </footer>
      </body>
    </html>
  );
}
