# Asistente AI UPM

Demo institucional sin backend para legisladores. Construida sobre el stack frontend Deenex con paleta institucional UPM.

## Stack

- Vite 7 + React 19 + TypeScript
- Tailwind CSS v4 (`@theme inline`)
- React Router DOM 7 (HashRouter para deploy estático)
- vite-plugin-pwa (offline + install)
- Inter (Fontshare), Lucide icons
- Estado en `localStorage` con `useSyncExternalStore`

## Pantallas

Login, Onboarding, Inicio, Asistente AI, Radar normativo, Conversación con novedades, Hablar con leyes e informes, Biblioteca UPM, Mi carpeta, Dossiers (lista + detalle), Agenda, Foros, Comparativa vs ChatGPT, Perfil.

## Cómo correr

```bash
cd client
npm install
npm run dev
```

URL local: http://127.0.0.1:5181/app-upm/

## Cómo buildear

```bash
cd client
npx vite build
```

Output en `client/dist/`.

## Deploy a GitHub Pages

La rama `gh-pages` sirve `client/dist/` con `.nojekyll`. URL pública: https://soyalantapia.github.io/app-upm/
