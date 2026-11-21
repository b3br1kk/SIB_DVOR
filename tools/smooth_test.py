import subprocess, time, json
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8767','-d','/home/claude/sib_dvor/docs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
out={}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':900}); pg=ctx.new_page(); errs=[]
  pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
  pg.goto('http://localhost:8767/',wait_until='networkidle'); pg.wait_for_timeout(800)
  out['smoothClass']=pg.evaluate("document.documentElement.classList.contains('smooth')")
  pg.mouse.move(700,450)
  pg.evaluate("window.__ys=[];(function f(){__ys.push(Math.round(scrollY));if(__ys.length<90)requestAnimationFrame(f)})()")
  pg.mouse.wheel(0,600); pg.wait_for_timeout(1600)
  ys=pg.evaluate("__ys"); out['wheel600_track']=ys[::6]; out['final']=ys[-1]
  # one wheel notch steps should be distributed across frames
  steps=[ys[i+1]-ys[i] for i in range(len(ys)-1)]; out['max_step']=max(steps); out['frames_moving']=sum(1 for s in steps if s>0)
  # anchor link
  pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(200)
  pg.click('.nav a[href="#karta"]'); pg.wait_for_timeout(2500)
  out['anchor_top']=pg.evaluate("Math.round(document.querySelector('#karta').getBoundingClientRect().top)")
  # keyboard End then wheel up still works
  pg.keyboard.press('End'); pg.wait_for_timeout(600); y1=pg.evaluate('scrollY'); pg.mouse.wheel(0,-400); pg.wait_for_timeout(1200); out['wheel_after_key']=y1-pg.evaluate('scrollY')
  # frame blending inside day: wheel through day section and check canvas changes
  top=pg.evaluate("document.querySelector('.day').offsetTop"); pg.evaluate(f"scrollTo(0,{top+1000})"); pg.wait_for_timeout(500)
  out['clock']=pg.inner_text('.day__clock')
  out['errs']=errs; b.close()
finally: srv.terminate()
print(json.dumps(out,ensure_ascii=False))
