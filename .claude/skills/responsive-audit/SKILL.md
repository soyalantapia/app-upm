---
name: responsive-audit
description: Verifica que cada pantalla del cliente Bartender funcione en mobile, tablet, POS portrait, POS landscape y desktop. Detecta overflow, contenido cortado, tap targets chicos, scrollbars indeseados, y elementos fijos que pisan. Usar antes de mergear cambios de layout o cuando el usuario pide "que ande bien en todos lados".
---

# Responsive Audit · Bartender App

## Procedimiento

Para cada pantalla (login, scan, order detail, orders list, confirmation):

1. **Mobile (375×812)** — `preview_resize preset: mobile`
   - ¿Cabe sin scroll horizontal?
   - ¿La barra inferior tapa contenido? (revisar `pb-*` del main)
   - Tap targets ≥44px
   - Safe area inferior (`env(safe-area-inset-bottom)`)

2. **Tablet (768×1024)** — `preview_resize preset: tablet`
   - ¿El layout sigue siendo mobile o pasa a uno intermedio?
   - Cards con grid 2 columnas donde tenga sentido
   - Padding generoso

3. **POS portrait (1024×1366)** — `preview_resize width: 1024 height: 1366`
   - Caso real: tablet vertical en barra
   - Targets MUY grandes (≥56px)
   - Tipografía aumentada vs tablet

4. **POS landscape (1280×800)** — `preview_resize width: 1280 height: 800`
   - Sidebar visible (lg+)
   - Contenido centrado, no estirado

5. **Desktop (1440×900)** — `preview_resize width: 1440 height: 900`
   - Sidebar + main + max-width
   - Sin elementos pegados a los bordes

## Para cada breakpoint, verificar

```js
// En preview_eval, detectar overflow horizontal
document.documentElement.scrollWidth > document.documentElement.clientWidth
// → debe ser false en TODOS los breakpoints

// Detectar elementos que se salen del viewport
[...document.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > window.innerWidth)
  .map(el => el.tagName + '.' + el.className.slice(0,40))

// Verificar tap targets
[...document.querySelectorAll('button, a')]
  .filter(el => {
    const r = el.getBoundingClientRect()
    return r.width < 44 || r.height < 44
  })
  .map(el => ({ tag: el.tagName, w: el.offsetWidth, h: el.offsetHeight, text: el.textContent.slice(0,30) }))
```

## Issues típicos a buscar

| Síntoma                                  | Causa frecuente                      | Fix                                    |
|------------------------------------------|--------------------------------------|----------------------------------------|
| Scroll horizontal en mobile              | `min-w` sin `max-w`, grid sin gap    | Añadir `overflow-x-hidden` al main     |
| Bottom bar pisa último item              | `pb` insuficiente                    | Aumentar `pb-*` (regla: bar height + bottom + 24) |
| Texto cortado en POS                     | `truncate` muy agresivo              | Usar `line-clamp-2` o `text-wrap: balance` |
| Botón chico en POS                       | `py-2` heredado de mobile            | Override con `lg:py-4` o usar `min-h-[56px]` |
| Sidebar desproporcionado en POS portrait | `lg:` activa a 1024 — POS portrait está justo en el límite | Usar `xl:` para sidebar persistente |
| Card transparente sobre primary-50       | `bg-primary-50` repetido             | Usar `bg-white` en cards               |

## Reportar

Devolver tabla:
```
| Pantalla     | BP        | Issue                              | Severidad | Fix sugerido        |
|--------------|-----------|------------------------------------|-----------|---------------------|
| OrderDetail  | Mobile    | Bottom bar pisa último producto    | Alta      | pb-40 → pb-56       |
```
