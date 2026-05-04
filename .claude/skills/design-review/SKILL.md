---
name: design-review
description: Auditoría UX/UI integral del cliente Bartender. Revisa jerarquía visual, contraste, espaciado, tipografía, alineación con el design system Deenex (Satoshi + paleta primary/neutral en light theme) y consistencia entre componentes. Usar cuando el usuario pide "revisar diseño", "polish", "mejorar UI", o antes de mostrar a stakeholders.
---

# Design Review · Bartender App

## Cómo correr la review

1. Levantar el cliente: `preview_start` con server `bartender-client`
2. Para cada breakpoint, navegar las pantallas clave y tomar `preview_screenshot`:
   - Login
   - Pantalla "Revisá tu mail" (post submit)
   - Escaneo (`/`)
   - Detalle de pedido pendiente (`/pedidos/DNX-A1B2C3`)
   - Detalle de pedido parcial (`/pedidos/DNX-X9Y8Z7`)
   - Detalle de pedido completado (`/pedidos/DNX-DONE99`)
   - Lista de pedidos (`/pedidos`)
   - Confirmación (entregar todo y mirar la pantalla final)
3. Para cada captura, evaluar contra el checklist (abajo).
4. Devolver una lista priorizada de issues: **bloqueantes / nice-to-have / decorativo**.

## Breakpoints a cubrir

| Dispositivo | Tamaño                    | Comando                                            |
|-------------|---------------------------|----------------------------------------------------|
| Mobile      | 375 × 812 (iPhone 14)     | `preview_resize preset: mobile`                    |
| Tablet      | 768 × 1024 (iPad)         | `preview_resize preset: tablet`                    |
| POS portrait| 1024 × 1366               | `preview_resize width: 1024 height: 1366`          |
| POS landsc. | 1280 × 800                | `preview_resize width: 1280 height: 800`           |
| Desktop     | 1440 × 900                | `preview_resize width: 1440 height: 900`           |

POS es el caso más crítico — barra/cocina/takeaway con tablets dedicadas. Los targets táctiles deben ser ≥44px.

## Checklist de review

### Tipografía
- [ ] Satoshi cargada (no fallback system-ui)
- [ ] Jerarquía clara: h1 / h2 / body / caption
- [ ] `text-balance` en headings, `text-pretty` en párrafos
- [ ] Pesos coherentes (700 títulos, 600 botones, 500 body)

### Color & contraste
- [ ] Texto principal sobre fondo cumple WCAG AA (4.5:1)
- [ ] Botones primarios con suficiente contraste con el fondo de la card
- [ ] Estados disabled distinguibles pero no chillan
- [ ] No hay grises "sucios" mezclados (toda la grilla usa primary-* y neutral-*)

### Espaciado
- [ ] Padding consistente entre cards (p-5 mobile, p-7 desktop)
- [ ] Gaps verticales en escalera 3/5/8
- [ ] Bottom-safe-area respetada en mobile (iPhone notch / home indicator)
- [ ] `pb-*` en páginas con barra fija no pisa contenido

### Touch targets
- [ ] Botones mínimo 44×44px en todos los breakpoints
- [ ] QuantityStepper con +/- ≥44px en POS y tablet
- [ ] Inputs con padding generoso (py-3.5 o más)
- [ ] Espacio entre tap-targets (≥8px)

### Estados
- [ ] Hover (solo desktop): elevación o cambio de bg suave
- [ ] Active: scale-[0.98] o brightness-95
- [ ] Focus visible (ring-2 ring-primary-400 en inputs)
- [ ] Disabled: opacity sin perder identidad
- [ ] Loading: spinner o skeleton, nunca pantalla en blanco

### Microcopy
- [ ] Español rioplatense ("Escaneá", "Entregá")
- [ ] CTAs con verbo + objeto ("Confirmar entrega", no "Enviar")
- [ ] Errores con tono humano, no técnico
- [ ] Vacíos con guía de qué hacer

### Layout responsive
- [ ] Mobile: navegación inferior flotante con safe-area
- [ ] Tablet: layout cómodo, no estirado
- [ ] POS: targets grandes, máximo aprovechamiento del ancho
- [ ] Desktop: sidebar fijo, max-w-3xl centrado

## Anti-patrones a flaggear

- ❌ Cards sin shadow ni border (se pierden en el bg)
- ❌ Botones rectangulares (todo debe ser `rounded-full` o `rounded-3xl`)
- ❌ Color hex inline cuando hay token de paleta
- ❌ Componentes con bg-white pisando bg-white (anidados sin separación)
- ❌ Texto en mayúsculas sin tracking (`tracking-widest`)
- ❌ Iconos sin `strokeWidth` consistente

## Output esperado

Devolver:
1. Tabla de issues por pantalla × breakpoint
2. Snippets concretos del fix (selector + cambio de Tailwind)
3. Captura del antes/después en los issues bloqueantes
