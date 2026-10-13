"""Copia y normaliza las fotos de origen dentro de Home/fotos.

Se usa una sola vez por tanda de fotos nuevas. Toma los originales (SharePoint de
Marketing de Nodo / repo ZLT-WEB-V2), aplica la orientación EXIF, los lleva a un
máximo de 2400 px de lado mayor (LANCZOS, JPEG q88, sin deformar) y los guarda con
nombre descriptivo. Deja asentado el origen de cada archivo en Home/_inventario.csv.

Uso:  python3 tools/preparar_fotos.py <carpeta-uploads>
"""
import csv, os, sys
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads'
MKT = os.path.join(UP, 'Nodo Cordoba - Documentos', 'Comunicación y Marketing')
AGO = os.path.join(MKT, 'Nodo', '05_Fotografia-Editada', 'Avance-De-Obra', '2026', '10 - 2026_Agosto')
REN = os.path.join(MKT, 'Nodo', '10_Renders', 'Definitivos')
ILU = os.path.join(MKT, 'Nodo', '10_Renders', 'Ilustraciones')
V2 = os.path.join(UP, 'REPOSITORIOS', 'REPO WEB ZLT V2', 'Home', 'fotos', 'proyectos')

# destino (relativo a Home/fotos) -> (origen, descripción)
LISTA = {
    # Nodo Flex · obra agosto 2026 (galería de la nave)
    'nodo-flex/nodo-flex-01.jpg': (f'{AGO}/DJI_0743.jpg', 'Nodo Flex · aérea con cubierta · ago 2026'),
    'nodo-flex/nodo-flex-02.jpg': (f'{AGO}/DJI_0753.jpg', 'Nodo Flex · aérea frente · ago 2026'),
    'nodo-flex/nodo-flex-03.jpg': (f'{AGO}/DJI_0714.jpg', 'Nodo Flex · cenital · ago 2026'),
    'nodo-flex/nodo-flex-04.jpg': (f'{AGO}/DJI_0730.jpg', 'Nodo Flex · aérea con autovía · ago 2026'),
    'nodo-flex/nodo-flex-05.jpg': (f'{AGO}/DJI_0738.jpg', 'Nodo Flex · aérea contexto · ago 2026'),
    'nodo-flex/nodo-flex-06.jpg': (f'{AGO}/DJI_0722.jpg', 'Nodo Flex · estructura · ago 2026'),
    'nodo-flex/nodo-flex-07.jpg': (f'{AGO}/0P1A8205.jpg', 'Nodo Flex · interior · ago 2026'),
    'nodo-flex/nodo-flex-08.jpg': (f'{AGO}/0P1A8287.jpg', 'Nodo Flex · interior estructura · ago 2026'),
    'nodo-flex/nodo-flex-09.jpg': (f'{AGO}/0P1A8251.jpg', 'Nodo Flex · lateral · ago 2026'),
    'nodo-flex/nodo-flex-10.jpg': (f'{AGO}/0P1A8245.jpg', 'Nodo Flex · esquina · ago 2026'),
    'nodo-flex/nodo-flex-11.jpg': (f'{AGO}/0P1A8217.jpg', 'Nodo Flex · panelería · ago 2026'),
    'nodo-flex/nodo-flex-12.jpg': (f'{AGO}/0P1A8289.jpg', 'Nodo Flex · cartel de obra · ago 2026'),
    'nodo-flex/nodo-flex-13.jpg': (f'{AGO}/DJI_0754.jpg', 'Nodo Flex · aérea cubierta en ejecución · ago 2026'),
    'nodo-flex/nodo-flex-14.jpg': (f'{AGO}/DJI_0699.jpg', 'Nodo Flex · aérea lejana con autovía · ago 2026'),
    # Avance de obra · selección distinta a la galería de la nave
    'obra-2026-08/obra-01.jpg': (f'{AGO}/DJI_0751.jpg', 'Avance · estructura y cubierta'),
    'obra-2026-08/obra-02.jpg': (f'{AGO}/DJI_0752.jpg', 'Avance · aérea lateral'),
    'obra-2026-08/obra-03.jpg': (f'{AGO}/DJI_0741.jpg', 'Avance · aérea con accesos'),
    'obra-2026-08/obra-04.jpg': (f'{AGO}/DJI_0712.jpg', 'Avance · cenital'),
    'obra-2026-08/obra-05.jpg': (f'{AGO}/0P1A8186.jpg', 'Avance · estructura metálica'),
    'obra-2026-08/obra-06.jpg': (f'{AGO}/0P1A8224.jpg', 'Avance · pórticos'),
    'obra-2026-08/obra-07.jpg': (f'{AGO}/0P1A8231.jpg', 'Avance · interior'),
    'obra-2026-08/obra-08.jpg': (f'{AGO}/0P1A8183.jpg', 'Avance · estructura'),
    'obra-2026-08/obra-09.jpg': (f'{AGO}/0P1A8304.jpg', 'Avance · cartel Nodo Flex'),
    'obra-2026-08/obra-10.jpg': (f'{AGO}/DJI_0702.jpg', 'Avance · aérea con Autovía 19'),
    # Parque · renders definitivos y fotos aéreas
    'renders/parque-aereo-01.jpg': (f'{REN}/2024-10-18_01.jpg', 'Render aéreo del parque completo'),
    'renders/parque-aereo-02.jpg': (f'{REN}/2024-10-18_02.jpg', 'Render aéreo del parque, vista de la autovía'),
    'renders/portico-acceso.jpg': (f'{REN}/2024-09-16_03.jpg', 'Render del pórtico de acceso'),
    'renders/naves-playon.jpg': (f'{REN}/2024-09-16_04.jpg', 'Render de naves y playón'),
    'renders/naves-frente.jpg': (f'{REN}/2025-01-23_05.jpg', 'Render de frente de naves'),
    'renders/nodo-flex-fachada.jpg': (f'{REN}/2025-01-21_06.jpg', 'Render fachada Nodo Flex'),
    'renders/nodo-flex-racks.jpg': (f'{REN}/2025-01-28_07.jpg', 'Render interior con racks'),
    'renders/nodo-flex-interior.jpg': (f'{REN}/2025-01-21_08.jpg', 'Render interior con oficina'),
    'renders/nodo-flex-oficinas-01.jpg': (f'{REN}/2025-01-21_09.jpg', 'Render oficinas'),
    'renders/nodo-flex-oficinas-02.jpg': (f'{REN}/2025-01-21_10.jpg', 'Render oficinas'),
    'parque/parque-01.jpg': (f'{V2}/nodo/nodo-04.jpg', 'Parque · aérea (repo ZLT-WEB-V2)'),
    'parque/parque-02.jpg': (f'{V2}/nodo/nodo-05.jpg', 'Parque · aérea (repo ZLT-WEB-V2)'),
    'parque/parque-03.jpg': (f'{V2}/nodo/nodo-06.jpg', 'Parque · aérea (repo ZLT-WEB-V2)'),
    'parque/parque-04.jpg': (f'{V2}/nodo/nodo-07.jpg', 'Parque · nave (repo ZLT-WEB-V2)'),
    'parque/parque-05.jpg': (f'{V2}/nodo/nodo-08.jpg', 'Parque · aérea (repo ZLT-WEB-V2)'),
    'parque/parque-06.jpg': (f'{V2}/nodo/nodo-09.jpg', 'Parque · cartel Nodo (repo ZLT-WEB-V2)'),
    # Ilustraciones
    'ilustraciones/masterplan-etapas.png': (f'{ILU}/2025-06-04_677d6dfdca441157247273.png', 'Masterplan coloreado por etapa'),
    'ilustraciones/parque-con-nodo-flex.png': (f'{ILU}/2025-06-04_dibujo-parque-completo.png', 'Dibujo del parque con Nodo Flex'),
}

def main():
    filas = []
    for dst, (src, desc) in LISTA.items():
        out = os.path.join(RAIZ, 'Home', 'fotos', dst)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im = ImageOps.exif_transpose(Image.open(src))
        if dst.endswith('.png'):
            im.save(out, optimize=False)
        else:
            im = im.convert('RGB')
            if max(im.size) > 2400:
                im.thumbnail((2400, 2400), Image.LANCZOS)
            im.save(out, quality=88, progressive=True)
        filas.append((f'fotos/{dst}', desc, os.path.relpath(src, UP)))
        print('ok', dst, im.size)
    with open(os.path.join(RAIZ, 'Home', '_fotos_origen.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f); w.writerow(['archivo', 'qué es', 'origen'])
        w.writerows(filas)

if __name__ == '__main__':
    main()
