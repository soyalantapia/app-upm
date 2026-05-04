---
name: ui-polish
description: Catálogo de patrones de polish visual para subir el nivel de la UI a "Linear / Vercel / Stripe-tier". Incluye microinteracciones, transiciones, sombras escalonadas, gradientes sutiles, easing curves, skeleton loaders, y empty states. Usar cuando el usuario pide "más polish", "que se vea premium", o "darle visual".
---

# UI Polish · Bartender App

## Sombras escalonadas (Tailwind 4)

Usar capas en lugar de una sombra única:
```html
<!-- Antes -->
<div className="shadow-md" />

<!-- Después -->
<div className="shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]" />
```

Niveles:
- `card`: `shadow-[0_1px_2px_rgba(0,0,0,0.04)]`
- `card-hover`: `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]`
- `floating`: `shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_16px_32px_-12px_rgba(0,0,0,0.18)]`
- `popover`: `shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1),0_24px_48px_-16px_rgba(0,0,0,0.2)]`

## Transiciones

Easing custom (más natural que `ease-in-out`):
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

Reglas:
- Hover: `transition-all duration-200 ease-out`
- Active: `active:scale-[0.98] transition-transform duration-100`
- Page enter: opacidad + translate-y `duration-300`
- Modales: spring para in, ease-out para out

## Microinteracciones

### Botón primario
```tsx
className="
  bg-primary-500 text-white rounded-full px-6 py-4
  shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(139,133,137,0.5)]
  transition-all duration-200 ease-out
  hover:bg-primary-600 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_24px_-6px_rgba(139,133,137,0.6)] hover:-translate-y-0.5
  active:translate-y-0 active:scale-[0.98] active:duration-100
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2
  disabled:bg-primary-200 disabled:text-primary-400 disabled:shadow-none disabled:cursor-not-allowed
"
```

### Card interactiva
```tsx
className="
  bg-white rounded-3xl p-5 ring-1 ring-neutral-100
  transition-all duration-300 ease-out
  hover:ring-neutral-200 hover:-translate-y-0.5
  hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]
"
```

### Input
```tsx
className="
  bg-primary-50 rounded-2xl ring-1 ring-transparent
  transition-all duration-200
  focus:bg-white focus:ring-2 focus:ring-primary-400 focus:shadow-sm
"
```

## Estados vacíos & loading

### Skeleton
```tsx
<div className="animate-pulse rounded-2xl bg-primary-100 h-24" />
```

### Empty state
- Icono grande en círculo coloreado
- Heading bold
- Subtítulo gris explicando qué pasa
- CTA con verbo de acción

### Loading spinner
```tsx
<Loader2 size={20} className="animate-spin text-neutral-400" />
```

## Detalles que importan

- **Tabular numbers** para números que cambian: `tabular-nums`
- **Letter spacing** en uppercase pequeño: `tracking-widest`
- **Anti-aliasing**: ya viene en body con `-webkit-font-smoothing: antialiased`
- **Active states** en touch: `-webkit-tap-highlight-color: transparent` (ya está en body)
- **Avatares**: borde sutil `ring-2 ring-white` para separar del fondo
- **Dividers**: en lugar de `border-t border-neutral-200`, usar `divide-y divide-neutral-100` con bg explícito

## Animaciones de entrada (al montar)

Definir en index.css:
```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both; }
```

Aplicar en page roots:
```tsx
<div className="animate-fade-up">…</div>
```

## Iconografía

- Lucide con `strokeWidth={2}` por defecto
- `strokeWidth={2.5}` o `3` para iconos en CTAs (más bold, contrastan)
- Tamaño consistente: 16 (badges), 18 (botones inline), 20 (botones grandes), 22-24 (containers principales)

## QR / scanner UX premium

- Frame con esquinas L (no marco completo) animadas
- Línea verde escaneando vertical
- Backdrop oscurecido alrededor del cuadro
