import subprocess, time, json, sys
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8768','-d','/home/claude/sib_dvor/docs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
out={}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--enable-gpu-rasterization']); ctx=b.new_context(viewport={'width':1440,'height':900}); pg=ctx.new_page(); errs=[]
  pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
  pg.goto('http://localhost:8768/',wait_until='networkidle'); pg.wait_for_timeout(2500)
  out['bar']=pg.evaluate("document.querySelector('.day__load i').style.width")
  top=pg.evaluate("document.querySelector('.day').offsetTop"); pg.evaluate(f"scrollTo(0,{top})"); pg.wait_for_timeout(800)
  pg.evaluate("""window.__lt=[];new PerformanceObserver(l=>{for(const e of l.getEntries())__lt.push(Math.round(e.duration))}).observe({type:'longtask',buffered:false});
  window.__dt=[];let last=performance.now();(function f(now){__dt.push(now-last);last=now;if(__dt.length<600)requestAnimationFrame(f)})(performance.now());""")
  pg.mouse.move(700,450)
  for _ in range(40): pg.mouse.wheel(0,120); pg.wait_for_timeout(110)
  pg.wait_for_timeout(1500)
  dt=pg.evaluate("__dt.slice(1)"); dt.sort()
  out['frames']=len(dt); out['median_ms']=round(dt[len(dt)//2],1); out['p95_ms']=round(dt[int(len(dt)*.95)],1); out['max_ms']=round(dt[-1],1)
  out['over33']=sum(1 for x in dt if x>33)
  out['longtasks']=pg.evaluate("__lt")
  out['clock']=pg.inner_text('.day__clock'); out['canvas']=pg.evaluate("[document.querySelector('.day__seq').width,document.querySelector('.day__seq').height]")
  out['errs']=errs; b.close()
finally: srv.terminate()
print(json.dumps(out,ensure_ascii=False))
