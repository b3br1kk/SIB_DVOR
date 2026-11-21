import subprocess, time, json
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8766','-d','/home/claude/site/docs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
out={}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':900}); pg=ctx.new_page(); errs=[]
  pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
  pg.add_init_script("window.open=()=>null")
  pg.goto('http://localhost:8766/'); pg.wait_for_timeout(1200); pg.evaluate("document.querySelector('#den').scrollIntoView()"); pg.wait_for_timeout(800); pg.screenshot(path='qa/i_plan_empty.jpg',type='jpeg',quality=70)
  pg.evaluate("document.querySelector('#karta').scrollIntoView()"); pg.wait_for_timeout(800)
  box=pg.locator('.map__frame').bounding_box()
  # hover cafe centroid (0.4827,0.5329) and a banya
  pg.mouse.move(box['x']+box['width']*0.4827, box['y']+box['height']*0.5329); pg.wait_for_timeout(200)
  out['tip_cafe']=pg.locator('.tip').inner_text()
  pg.mouse.move(box['x']+box['width']*0.7996, box['y']+box['height']*0.6751); pg.wait_for_timeout(200)
  out['tip_izba']=pg.locator('.tip').inner_text()
  pg.mouse.click(box['x']+box['width']*0.7996, box['y']+box['height']*0.6751); pg.wait_for_timeout(300)
  out['zone_title']=pg.locator('.zone__t').inner_text()
  pg.locator('.seg button[data-time="3"]').click(); pg.wait_for_timeout(800)
  pg.screenshot(path='qa/i_map_night.jpg',type='jpeg',quality=70)
  pg.locator('.zone__add').click(); pg.wait_for_timeout(200)
  pg.locator('.pin[data-zone=banya]').click(); pg.locator('.zone__add').click()
  pg.evaluate("document.querySelector('#den').scrollIntoView()"); pg.wait_for_timeout(600)
  pg.locator('.num__b[data-d="1"]').click(); pg.locator('.num__b[data-d="1"]').click()
  pg.locator('input[name=lunch]').check(); pg.locator('input[name=dinner][value=banket]').check()
  pg.locator('.chip[data-day="6"]').click(); pg.wait_for_timeout(300)
  out['lines']=pg.locator('[data-r=lines]').inner_text(); out['total']=pg.locator('[data-r=total]').inner_text(); out['msg']=pg.locator('[data-r=msg]').inner_text()
  ctx.grant_permissions(['clipboard-read','clipboard-write'])
  pg.locator('[data-send]').click(); pg.wait_for_timeout(400); out['copied']=pg.locator('.receipt__copied').inner_text()
  pg.screenshot(path='qa/i_plan.jpg',type='jpeg',quality=70)
  out['errs']=errs; b.close()
finally: srv.terminate()
print(json.dumps(out,ensure_ascii=False,indent=1))
