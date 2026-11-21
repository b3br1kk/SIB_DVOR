import sys, json, asyncio, subprocess, time, os
from playwright.sync_api import sync_playwright
ROOT='/home/claude/site/docs'; QA='/home/claude/site/qa'
srv=subprocess.Popen(['python3','-m','http.server','8765','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
res={}
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp,mob in (('d',{'width':1440,'height':900},False),('m',{'width':390,'height':844},True)):
      ctx=b.new_context(viewport=vp,device_scale_factor=1,is_mobile=mob,has_touch=mob)
      pg=ctx.new_page(); errs=[]; bad=[]
      pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
      pg.on('pageerror',lambda e: errs.append(str(e)))
      pg.on('response',lambda r: bad.append(f'{r.status} {r.url}') if r.status>=400 else None)
      pg.goto('http://localhost:8765/index.html',wait_until='networkidle'); pg.wait_for_timeout(1500)
      H=pg.evaluate('document.documentElement.scrollHeight'); vh=vp['height']
      shots=[]
      # hero
      pg.screenshot(path=f'{QA}/{name}_00_hero.jpg',quality=70,type='jpeg'); shots.append('hero')
      # day chapters
      top=pg.evaluate("document.querySelector('.day').getBoundingClientRect().top+scrollY")
      dh=pg.evaluate("document.querySelector('.day').offsetHeight")
      for i,f in enumerate((0.08,0.33,0.58,0.83,0.95)):
        pg.evaluate(f'window.scrollTo(0,{top+(dh-vh)*f})'); pg.wait_for_timeout(500)
        pg.screenshot(path=f'{QA}/{name}_1{i}_day.jpg',quality=70,type='jpeg')
      for sec in ('#karta','#den','#otzyvy','.faq','#kontakty'):
        pg.evaluate(f"document.querySelector('{sec}').scrollIntoView()"); pg.wait_for_timeout(900)
        pg.screenshot(path=f'{QA}/{name}_2{sec.strip("#.").replace("-","_")}.jpg',quality=70,type='jpeg')
      ov=pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1 && !e.closest('.day__stage,.map__scroll,.hero__media,.orn,svg')}).slice(0,8).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right))")
      sw=pg.evaluate('document.documentElement.scrollWidth')
      imgs=pg.evaluate("[...document.images].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src)")
      res[name]=dict(errors=errs,bad=bad,overflow=ov,scrollWidth=sw,broken=imgs,height=H)
      ctx.close()
    b.close()
finally:
  srv.terminate()
print(json.dumps(res,ensure_ascii=False,indent=1))
