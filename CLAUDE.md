# web-nodo

Web de Nodo (parque logístico) y Nodo Flex (ver `LEEME.txt`). Un HTML con todo adentro
salvo los loops de dron (carpeta `Home/html/videos/`, al lado del HTML) y el video de la Home, que viene de YouTube.
Tres vistas por dirección: `#/`, `#/empresas`, `#/inversores`.

## Cómo se trabaja
- Fuente de verdad: `src/` (plantillas Jinja2, `css/nodo.css`, `js/nodo.js`, `datos/*.json`)
  y las imágenes de `Home/fotos`, `Home/logos`, `Home/iconos`.
- Armar: `python3 src/build.py` → `Home/html/NODO-WEB-home.html`. Nunca editar ese HTML a mano.
- Verificar: `python3 tools/verificar.py <carpeta_capturas>` (0 errores JS, 0 overflow,
  galerías íntegras, mapas inicializados en 1440/768/390). Límite del HTML: 30 MiB.
- Todo texto visible lleva las dos versiones: `{{ t('es','en') }}`.
- Video de la Home: desde YouTube con la API oficial del reproductor (`sitio.json` → videos.banner_header = horizontal
  sin subtítulos iK5m5qP8ujw; videos.banner = kDgVQJJAjqk, el oficial público del botón "Video oficial"; videos.banner_vertical = Short 7KsC7D_AQ6A para celular vertical). Arranca solo y sin sonido,
  sin subtítulos (CC) nunca, sin controles de YouTube; botones propios de pausa y sonido. La pantalla de carga
  espera a que YouTube esté reproduciendo en HD (720p o más). Abierto como archivo suelto (file://) YouTube no
  carga: se ve la imagen fija; en la web publicada sí.
- Empresas e Inversores = loop de dron sin sonido (`Home/html/videos/nodo-hero-*`, .mp4 H.264 + .webm VP9),
  publicados junto al HTML como `videos/…`.
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
