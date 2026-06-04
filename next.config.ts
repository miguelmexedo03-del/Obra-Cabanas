import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto nesta pasta. Sem isto, o Turbopack deteta um
  // package-lock.json perdido em C:\Users\migue e tenta indexar toda a home
  // (OneDrive, Desktop, outros projetos) — o que satura CPU/disco.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
