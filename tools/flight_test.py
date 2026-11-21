import subprocess, time, json, statistics, sys
OM=sys.argv[1] if len(sys.argv)>1 else ''
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8769','-d','/home/claude/sib_dvor/docs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
out={}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':900}); pg=ctx.new_page(); errs=[]
  pg.on('pageerror',lambda e: errs.append(str(e)))
  cdp=ctx.new_cdp_session(pg); cdp.send('Network.enable'); cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':40,'downloadThroughput':10e6/8,'uploadThroughput':2e6/8})
  t0=time.time(); pg.goto('http://localhost:8769/'+('?omega='+OM if OM else '')); 
  marks={}
  while time.time()-t0<40:
    st=pg.evaluate("window.__sdSeq?{lo:__sdSeq.seq.haveLo,hi:__sdSeq.seq.haveHi}:null")
    if st:
      if 'lo_all' not in marks and st['lo']>=440: marks['lo_all']=round(time.time()-t0,1)
      if 'lo_half' not in marks and st['lo']>=220: marks['lo_half']=round(time.time()-t0,1)
    if 'lo_all' in marks: break
    time.sleep(0.25)
  out['load_10mbps']=marks; out['hi_at_lo_all']=pg.evaluate("__sdSeq.seq.haveHi")
  cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
  # скорость камеры при равномерном вращении колеса (щелчки по 100 px каждые 100 мс)
  top=pg.evaluate("document.querySelector('.day').offsetTop"); dh=pg.evaluate("document.querySelector('.day').offsetHeight-innerHeight")
  pg.evaluate(f"scrollTo(0,{top+dh*0.36*0.25})"); pg.wait_for_timeout(1500)
  pg.evaluate("window.__d=[];window.__run=true;(function f(now){__d.push([now,__sdSeq.seq.disp]);if(__run)requestAnimationFrame(f)})(performance.now())")
  pg.mouse.move(700,450)
  for _ in range(16): pg.mouse.wheel(0,100); pg.wait_for_timeout(100)
  pg.wait_for_timeout(1200); pg.evaluate("__run=false")
  d=pg.evaluate("__d")
  v=[(d[i+1][1]-d[i][1])/max(1e-3,(d[i+1][0]-d[i][0])/1000) for i in range(len(d)-1)]
  # стационарная часть: середина серии щелчков
  n=len(v); mid=v[int(n*0.25):int(n*0.6)]
  out['vel_mean_fps']=round(statistics.mean(mid),1); out['vel_cv']=round(statistics.pstdev(mid)/max(1e-6,statistics.mean(mid)),3)
  out['coverage']=pg.evaluate("(()=>{const s=__sdSeq.seq;let h=0;for(const e of s.bmp.values()) if(e.hi) h++;return {bitmaps:s.bmp.size,hi:h}})()")
  out['errs']=errs; b.close()
finally: srv.terminate()
print(json.dumps(out,ensure_ascii=False))
