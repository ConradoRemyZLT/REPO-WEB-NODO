"""Verificación con Chromium: errores de JS, overflow, galerías, mapas y capturas.
Uso: python3 tools/verificar.py [carpeta_capturas] [fuente_preview_dir]"""
import asyncio, sys, os, base64, json
from playwright.async_api import async_playwright
RAIZ=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML='file://'+os.path.join(RAIZ,'Home','html','NODO-WEB-home.html')
OUT=sys.argv[1] if len(sys.argv)>1 else '/tmp/capturas'
FONT=sys.argv[2] if len(sys.argv)>2 else None
os.makedirs(OUT,exist_ok=True)
CSSF=''
if FONT:
    for w in (300,400,700,800):
        b=base64.b64encode(open(f'{FONT}/urbanist-latin-{w}-normal.woff2','rb').read()).decode()
        CSSF+=f"@font-face{{font-family:'Gilroy';font-weight:{w};src:url(data:font/woff2;base64,{b}) format('woff2')}}"
CHECK='''() => {
 const r={};
 r.overflow = document.documentElement.scrollWidth - innerWidth;
 const v=document.body.dataset.view;
 const gs=[...document.querySelectorAll(`.view[data-view="${v}"] [data-gallery]`)];
 r.galleries=gs.map(g=>({slides:g.querySelectorAll('.gslide').length, count:+g.querySelector('.gcount').textContent.split('/')[1], next:!!g.querySelector('.gnext')}));
 r.maps=[...document.querySelectorAll(`.view[data-view="${v}"] [data-map]`)].map(m=>!!m._map);
 r.imgsMissing=[...document.querySelectorAll(`.view[data-view="${v}"] img[data-img]`)].filter(i=>!i.dataset.done).length;
 r.off=[...document.querySelectorAll(`.view[data-view="${v}"] *`)].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.gviewport,.acc-mq,.leaflet-container,.nmap,.mp,.hdr,.mov,.wm')}).slice(0,8).map(e=>e.className+' '+e.tagName+' '+Math.round(e.getBoundingClientRect().right));
 return r;}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        res={}
        for W,H in [(1440,900),(768,1024),(390,844)]:
            for view in ['','empresas','inversores']:
                ctx=await b.new_context(viewport={'width':W,'height':H})
                pg=await ctx.new_page(); errs=[]
                pg.on('pageerror',lambda e: errs.append(str(e)))
                pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'net::' not in m.text and 'Failed to load resource' not in m.text else None)
                await pg.goto(HTML+('#/'+view if view else ''),wait_until='load')
                if CSSF: await pg.add_style_tag(content=CSSF)
                await pg.add_style_tag(content='*,*::before,*::after{transition:none!important;animation:none!important}[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}.hline>span{transform:none!important}')
                await pg.wait_for_timeout(600)
                # recorrer para hidratar
                h=await pg.evaluate('document.documentElement.scrollHeight')
                for y in range(0,h,700):
                    await pg.evaluate(f'scrollTo(0,{y})'); await pg.wait_for_timeout(60)
                await pg.wait_for_timeout(800)
                await pg.evaluate('scrollTo(0,0)'); await pg.wait_for_timeout(300)
                r=await pg.evaluate(CHECK); r['errors']=errs[:5]
                name=f'{view or "home"}-{W}'
                res[name]=r
                await pg.screenshot(path=f'{OUT}/{name}.png',full_page=True)
                await ctx.close()
        await b.close()
        print(json.dumps(res,indent=1,ensure_ascii=False))
asyncio.run(main())
