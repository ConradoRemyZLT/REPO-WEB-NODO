# web-nodo

Web de Nodo (parque logístico) y Nodo Flex (ver `LEEME.txt`). Un HTML con todo adentro
salvo los videos de los encabezados (carpeta `Home/html/videos/`, al lado del HTML).
Tres vistas por dirección: `#/`, `#/empresas`, `#/inversores`.

## Cómo se trabaja
- Fuente de verdad: `src/` (plantillas Jinja2, `css/nodo.css`, `js/nodo.js`, `datos/*.json`)
  y las imágenes de `Home/fotos`, `Home/logos`, `Home/iconos`.
- Armar: `python3 src/build.py` → `Home/html/NODO-WEB-home.html`. Nunca editar ese HTML a mano.
- Verificar: `python3 tools/verificar.py <carpeta_capturas>` (0 errores JS, 0 overflow,
  galerías íntegras, mapas inicializados en 1440/768/390). Límite del HTML: 30 MiB.
- Todo texto visible lleva las dos versiones: `{{ t('es','en') }}`.
- Videos de encabezado (en `Home/html/videos/`, se publican junto al HTML como `videos/…`):
  Home = video oficial de Nodo Flex (`nodo-oficial-16x9` escritorio, `-9x16` celular vertical), con sonido,
  arranca solo y sin sonido; botones de pausa y sonido. Empresas e Inversores = loop de dron sin sonido
  (`nodo-hero-*`). Cada uno en .mp4 (H.264) y .webm (VP9, respaldo). Si se abre el HTML suelto, sin la
  carpeta videos/, se ve la imagen fija.
- Imágenes: en las plantillas se piden con `img('fotos/…', ancho)` → atributo `data-img`;
  viajan una sola vez en `#nodo-img` y el JS las coloca. Íconos: `ico('nombre')` → clase con máscara.
- Marca: azul #0026A3, hueso #ECE9E5, azul medio #7E92C3, Gilroy. Titulares en mayúsculas
  mezclando Light y `<b>` ExtraBold. Logos en `Home/logos/marca/*.svg` (currentColor).
- Estados de obra: clases `tag-func / tag-adv / tag-opp / tag-done` (sistema ZLT).

## Publicar
`.github/workflows/pages.yml` arma `_site/` en cada push a `main`. La web no lleva login. `/empresas/` y `/inversores/`
redirigen a las vistas, para usarlas en campañas.

## Datos sensibles
Los informes de avance de obra son confidenciales: no publicar porcentajes de avance.
Nodo Flex: módulos mínimos de 600 m²; finalización prevista marzo 2027 (`src/datos/sitio.json` → obra.fin_es).
