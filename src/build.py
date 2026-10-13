#!/usr/bin/env python3
"""Arma la web de Nodo en un solo HTML autocontenido.

    python3 src/build.py            → Home/html/NODO-WEB-home.html
    python3 src/build.py --rapido   → mismo HTML, con fotos más livianas (para revisar)

Qué hace:
  · Toma las plantillas de src/plantillas (Jinja2), el CSS de src/css y el JS de src/js.
  · Convierte cada foto/ícono que usan las plantillas a WebP y la embebe en base64.
    Cada imagen viaja UNA sola vez dentro del HTML aunque se use en varias vistas:
    las plantillas la piden con img('ruta') y el navegador la coloca al mostrarla.
  · Leaflet viaja embebido (desde src/js/vendor), así el mapa no depende de un CDN.
  · Los videos de los encabezados NO van adentro (no entran): viven en Home/html/videos/
    junto al HTML y se publican con él. El HTML los pide como videos/<nombre>.mp4 (o .webm).
  · Escribe el HTML en Home/html/ y avisa si pasa el límite de 30 MiB.

Las fotos de origen viven en Home/fotos, Home/logos y Home/iconos: son las que se
editan o reemplazan. El HTML se regenera siempre desde acá; no se edita a mano.
"""
import base64, hashlib, io, json, os, re, sys
from PIL import Image, ImageOps
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

SRC = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(SRC)
HOME = os.path.join(RAIZ, 'Home')
CACHE = os.path.join(RAIZ, '.cache')
SALIDA = os.path.join(HOME, 'html', 'NODO-WEB-home.html')
RAPIDO = '--rapido' in sys.argv
LIMITE = 30 * 1024 * 1024

os.makedirs(CACHE, exist_ok=True)


# ───────────────────────── imágenes ─────────────────────────
def _webp(ruta, ancho, calidad, alfa_q=90):
    """Devuelve 'data:image/webp;base64,...' de la imagen, redimensionada sin deformar."""
    abs_ = os.path.join(HOME, ruta)
    st = os.stat(abs_)
    if RAPIDO:
        ancho = min(ancho, 900); calidad = min(calidad, 55)
    clave = hashlib.sha1(f'{ruta}|{st.st_mtime_ns}|{st.st_size}|{ancho}|{calidad}'.encode()).hexdigest()
    cache = os.path.join(CACHE, clave + '.b64')
    if os.path.exists(cache):
        return open(cache).read()
    im = ImageOps.exif_transpose(Image.open(abs_))
    tiene_alfa = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if tiene_alfa else 'RGB')
    if im.width > ancho:
        alto = round(im.height * ancho / im.width)
        im = im.resize((ancho, alto), Image.LANCZOS)
    buf = io.BytesIO()
    if tiene_alfa:
        im.save(buf, 'WEBP', quality=alfa_q, method=6)
    else:
        im.save(buf, 'WEBP', quality=calidad, method=6)
    uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    open(cache, 'w').write(uri)
    return uri


class Registro:
    """Imágenes que viajan una sola vez y se colocan desde el JS (data-img)."""
    def __init__(self):
        self.items = {}

    def img(self, ruta, ancho=1400, calidad=72):
        clave = re.sub(r'[^a-z0-9]+', '-', ruta.lower().rsplit('.', 1)[0]).strip('-')
        clave = f'{clave}-{ancho}'
        if clave not in self.items:
            self.items[clave] = _webp(ruta, ancho, calidad)
        return clave


REG = Registro()
ICONOS = {}   # nombre → data uri (máscaras CSS)


def img(ruta, ancho=1400, calidad=72):
    return REG.img(ruta, ancho, calidad)


def inline(ruta, ancho=1400, calidad=74):
    """Imagen embebida directamente en el atributo (para lo que se ve al cargar)."""
    return _webp(ruta, ancho, calidad)


def ico(nombre):
    """Clase CSS de un ícono de la iconografía de Nodo (se pinta con mask-image)."""
    if nombre not in ICONOS:
        ICONOS[nombre] = _webp(f'iconos/servicios/{nombre}.png', 128, 90)
    return f'i-{nombre}'


def ico_contacto(nombre):
    k = 'c-' + nombre
    if k not in ICONOS:
        ICONOS[k] = _webp(f'iconos/contacto/{nombre}.png', 96, 90)
    return f'i-{k}'


def svg(nombre, clase='', titulo=''):
    s = open(os.path.join(HOME, 'logos', 'marca', nombre + '.svg'), encoding='utf-8').read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    attrs = f' width="{vb[2]:.0f}" height="{vb[3]:.0f}"'
    attrs += f' class="{clase}"' if clase else ''
    attrs += f' role="img" aria-label="{titulo}"' if titulo else ' aria-hidden="true"'
    return Markup(s.replace('<svg ', '<svg' + attrs + ' ', 1))


def svg_uri(nombre, color):
    s = open(os.path.join(HOME, 'logos', 'marca', nombre + '.svg'), encoding='utf-8').read()
    s = s.replace('currentColor', color)
    return 'data:image/svg+xml;base64,' + base64.b64encode(s.encode()).decode()


def t(es, en=None):
    """Texto bilingüe: <span class="l-es">…</span><span class="l-en">…</span>."""
    if en is None:
        en = es
    return Markup(f'<span class="l-es">{es}</span><span class="l-en">{en}</span>')


def leer(nombre):
    return open(os.path.join(SRC, nombre), encoding='utf-8').read()


# ───────────────────────── armado ─────────────────────────
def main():
    datos = json.load(open(os.path.join(SRC, 'datos', 'sitio.json'), encoding='utf-8'))
    prensa = json.load(open(os.path.join(SRC, 'datos', 'prensa.json'), encoding='utf-8'))

    env = Environment(loader=FileSystemLoader(os.path.join(SRC, 'plantillas')),
                      autoescape=False, trim_blocks=True, lstrip_blocks=True)
    env.globals.update(t=t, img=img, inline=inline, ico=ico, ico_contacto=ico_contacto,
                       svg=svg, svg_uri=svg_uri, d=datos, prensa=prensa)

    html = env.get_template('base.html').render()

    css_iconos = '\n'.join(
        f'.{("i-" + k)}{{-webkit-mask-image:url({v});mask-image:url({v})}}' for k, v in ICONOS.items())
    css = (leer('css/nodo.css')
           + '\n/* Íconos de la iconografía de Nodo (generado por build.py) */\n' + css_iconos)
    html = html.replace('/*__CSS__*/', css)
    html = html.replace('/*__LEAFLET_CSS__*/', leer('js/vendor/leaflet.css'))
    html = html.replace('/*__LEAFLET_JS__*/', leer('js/vendor/leaflet.js'))
    html = html.replace('/*__JS__*/', leer('js/nodo.js'))
    imgs = json.dumps(REG.items, separators=(',', ':'))
    html = html.replace('__IMGS__', imgs.replace('</', '<\\/'))

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    peso = os.path.getsize(SALIDA)
    print(f'{os.path.relpath(SALIDA, RAIZ)}  ·  {peso / 1048576:.1f} MiB  ·  '
          f'{len(REG.items)} imágenes  ·  {len(ICONOS)} íconos')
    if peso > LIMITE:
        print('ATENCIÓN: supera 30 MiB (límite de subida).')
        sys.exit(1)


if __name__ == '__main__':
    main()
