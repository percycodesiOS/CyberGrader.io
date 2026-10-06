// Run with Playwright available through NODE_PATH. Uses one isolated browser,
// a loopback-only ephemeral server and fictional records. No shared profile.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!/^[\w.-]+$/.test(name)){res.writeHead(404).end();return;}
  const file=path.join(__dirname,name);if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
});
let browser;
const key='circ-passdesk-v2';
async function message(page,text){await page.waitForFunction(t=>document.getElementById('message').textContent.includes(t),text,{timeout:5000});}
async function unlock(page,first=false){
  if(await page.locator('#staff-access').isHidden())await page.locator('#staff-toggle').click();
  await page.locator('#pin').fill('728491');if(first)await page.locator('#pin-confirm').fill('728491');
  await page.locator('#pin-submit').click();await page.locator('#staff-panel').waitFor({state:'visible'});
}
async function approve(page,card,student){
  await page.locator('#approval-pass').fill(String(card));await page.locator('#student-code').fill(student);
  assert.equal(await page.locator('#expected-time').count(),1,'Staff can choose the approved visit time');
  await page.locator('#expected-time').fill('13:30');
  await page.locator('#approval-confirm').check();await page.locator('#approve-button').click();await message(page,'approved. Staff controls locked.');
  assert.equal(await page.locator('#staff-panel').isHidden(),true);
  assert.equal(await page.locator('[data-mode=depart]').getAttribute('aria-pressed'),'true');
}
async function manual(page,number){await page.locator('#scan-number').fill(String(number));await page.locator('#scan-submit').click();}
async function saved(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
  const executable=process.env.PASSDESK_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  browser=await chromium.launch({executablePath:executable,headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'America/Los_Angeles'}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});
  await page.goto(url);await page.locator('#scan-submit').waitFor({state:'visible'});await unlock(page,true);
  await page.locator('[data-mode=return]').click();await approve(page,1,'TEST-A');
  assert.equal((await saved(page)).trips[0].expectedAt,Date.parse('2026-10-05T17:30:00Z'));
  assert.match(await page.locator('#active-list').innerText(),/1:30 PM/);
  assert.doesNotMatch(await page.locator('#active-list').innerText(),/TEST-A/);
  await manual(page,1);await message(page,'visit registered');assert.equal((await saved(page)).revision,2);
  // Global scanner with focus on a mode button, rather than an input.
  await page.locator('[data-mode=arrive]').click();await page.locator('[data-mode=arrive]').focus();await page.keyboard.type('CIRC001',{delay:10});await page.keyboard.press('Enter');await message(page,'arrival recorded');
  const arrived=await saved(page);assert.equal(arrived.revision,3);assert.ok(arrived.trips[0].arrivedAt);
  await page.keyboard.type('CIRC-001',{delay:10});await page.keyboard.press('Enter');await message(page,'already recorded');assert.equal((await saved(page)).revision,3);
  await page.reload();await page.waitForFunction(()=>!document.getElementById('scan-submit').disabled);assert.equal(await page.locator('#staff-panel').isHidden(),true);assert.equal((await saved(page)).revision,3);
  await page.locator('[data-mode=return]').click();await manual(page,1);await message(page,'returned and ready');
  await manual(page,2);await message(page,'no staff approval');assert.equal((await saved(page)).trips.length,1);
  assert.equal(await page.locator('#scan-number').inputValue(),'');
  await page.locator('[data-mode=depart]').click();await manual(page,1);await message(page,'This trip is closed');
  await unlock(page);await approve(page,1,'TEST-B');assert.equal((await saved(page)).trips.length,2);
  // Failed write must not publish a departure or discard the saved approval.
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='circ-passdesk-v2')throw new DOMException('Test quota failure','QuotaExceededError');return window.originalSetItem.call(this,k,v);};});
  await manual(page,1);await message(page,'Nothing from this attempt was recorded');assert.equal((await saved(page)).trips[1].departedAt,null);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
  await manual(page,1);await message(page,'visit registered');
  await unlock(page);await page.locator('[data-mode=return]').click();await page.locator('#approval-pass').focus();
  const beforeStaffScan=(await saved(page)).revision;
  await page.keyboard.type('CIRC-001',{delay:10});await page.keyboard.press('Enter');
  assert.equal(await page.locator('#approval-pass').inputValue(),'CIRC-001');assert.equal((await saved(page)).revision,beforeStaffScan);assert.equal((await saved(page)).trips[1].returnedAt,null);
  await page.locator('#staff-toggle').click();
  await page.screenshot({path:path.join(os.tmpdir(),'passdesk-desktop-check.png'),fullPage:true});
  // A second actual tab sees storage updates and cannot create a duplicate departure.
  const second=await context.newPage();await second.goto(url);await second.waitForFunction(()=>!document.getElementById('scan-submit').disabled);
  await manual(second,1);await message(second,'already recorded');assert.equal((await saved(second)).trips.length,2);await second.close();
  // Staff lock on visibility change and idle timeout.
  await unlock(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('#staff-panel').isHidden(),true);
  await page.evaluate(()=>{delete document.hidden;});
  await unlock(page);await page.clock.fastForward(100000);await page.locator('[data-mode=arrive]').click();await page.clock.fastForward(96000);assert.equal(await page.locator('#staff-panel').isHidden(),true);
  const restoreCopy=await saved(page);await page.evaluate(k=>localStorage.removeItem(k),key);await page.reload();await page.waitForFunction(()=>document.getElementById('storage-status').textContent.includes('records are missing'));assert.equal(await page.locator('#scan-submit').isDisabled(),true);await unlock(page);await page.locator('#restore-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{')});await message(page,'Backup was not restored');assert.equal(await page.locator('#scan-submit').isDisabled(),true);page.once('dialog',dialog=>dialog.accept());await page.locator('#restore-file').setInputFiles({name:'test-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restoreCopy))});await message(page,'Private backup restored');assert.deepEqual(await saved(page),restoreCopy);assert.equal(await page.locator('#scan-submit').isDisabled(),false);
  assert.deepEqual(errors,[]);await context.close();
  // Scanner regression checks use a separate empty profile and fictional names.
  const scanContext=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'America/Los_Angeles'}),scanPage=await scanContext.newPage();
  const scanErrors=[],remoteRequests=[];
  scanPage.on('pageerror',error=>scanErrors.push(error.message));
  scanPage.on('request',request=>{if(!request.url().startsWith(url)&&!request.url().startsWith('blob:'))remoteRequests.push(request.url());});
  await scanPage.clock.install({time:new Date('2026-10-05T15:00:00Z')});
  await scanPage.goto(url);await unlock(scanPage,true);
  await approve(scanPage,'*CIRC007*','FICTIONAL TEST STUDENT');
  assert.equal((await saved(scanPage)).trips[0].expectedAt,Date.parse('2026-10-05T17:30:00Z'));
  await scanPage.locator('#focus-scan').click();
  await scanPage.keyboard.type('CIRC099',{delay:10});await scanPage.keyboard.press('Enter');await message(scanPage,'no staff approval');
  assert.equal(await scanPage.locator('#scan-number').inputValue(),'');
  assert.equal(await scanPage.locator('#scan-number').evaluate(e=>document.activeElement===e),true);
  await scanPage.keyboard.type(']C0CIRC007',{delay:10});await scanPage.keyboard.press('Tab');await message(scanPage,'visit registered');
  assert.equal((await saved(scanPage)).revision,2);
  await scanPage.keyboard.press('Enter');await scanPage.keyboard.press('Tab');assert.equal((await saved(scanPage)).revision,2);
  await scanPage.locator('[data-mode=arrive]').click();await scanPage.locator('[data-mode=arrive]').focus();
  await scanPage.keyboard.type(']A0*CIRC007*',{delay:10});await scanPage.keyboard.press('Tab');await message(scanPage,'arrival recorded');
  assert.equal((await saved(scanPage)).revision,3);
  // A prefixed scanner burst cannot submit an approval or replace a name.
  await unlock(scanPage);assert.match(await scanPage.locator('#active-list').innerText(),/FICTIONAL TEST STUDENT/);
  await scanPage.locator('#student-code').fill('Name being edited');
  await scanPage.keyboard.type('CIRC007',{delay:10});await scanPage.keyboard.press('Enter');await message(scanPage,'Staff field kept unchanged');
  assert.equal(await scanPage.locator('#student-code').inputValue(),'Name being edited');assert.equal((await saved(scanPage)).revision,3);
  await scanPage.locator('#approval-pass').fill('');await scanPage.locator('#approval-pass').focus();
  await scanPage.keyboard.type(']C0CIRC008',{delay:10});await scanPage.keyboard.press('Tab');
  assert.equal(await scanPage.locator('#approval-pass').inputValue(),'CIRC-008');assert.equal((await saved(scanPage)).revision,3);
  await scanPage.locator('#student-code').fill('');await scanPage.keyboard.type('CIRC007',{delay:150});
  assert.equal(await scanPage.locator('#student-code').inputValue(),'CIRC007');assert.equal((await saved(scanPage)).revision,3);
  // Download contains the saved names/times, and makes no external request.
  const downloadPromise=scanPage.waitForEvent('download');await scanPage.locator('#export-data').click();const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^CIRC-Check-In-private-backup/);
  assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),await saved(scanPage));
  await scanPage.screenshot({path:path.join(os.tmpdir(),'circ-check-in-staff-check.png'),fullPage:true});
  await scanPage.locator('#staff-toggle').click();assert.doesNotMatch(await scanPage.locator('#active-list').innerText(),/FICTIONAL TEST STUDENT/);
  // No suffix: the visible Record button is the fallback. Duplicate finish is inert.
  await scanPage.locator('[data-mode=return]').click();await scanPage.keyboard.type('*CIRC007*',{delay:10});
  assert.equal((await saved(scanPage)).revision,3);await scanPage.locator('#scan-submit').click();await message(scanPage,'finished / returned');
  await manual(scanPage,7);await message(scanPage,'already recorded');assert.equal((await saved(scanPage)).revision,4);
  await scanPage.screenshot({path:path.join(os.tmpdir(),'circ-check-in-complete-check.png'),fullPage:true});
  // A released v2 record has no expectedAt. Reload preserves it byte-for-byte.
  const legacyRecord={version:2,revision:2,trips:[{id:'trip-1791201600000-1',pass:'CIRC-012',student:'LEGACY TEST STUDENT',destination:'ECTV',approvedAt:1791201600000,expiresAt:1791259200000,departedAt:1791201601000,arrivedAt:null,returnedAt:null,cancelledAt:null}]};
  const legacyText=JSON.stringify(legacyRecord);
  await scanPage.evaluate(({key,value})=>{localStorage.setItem(key,value);localStorage.setItem('circ-hall-pass-demo-v1','old-demo-kept');localStorage.setItem('unrelated-test-data','kept');},{key,value:legacyText});
  await scanPage.reload();await scanPage.waitForFunction(()=>!document.getElementById('scan-submit').disabled);
  assert.equal(await scanPage.evaluate(k=>localStorage.getItem(k),key),legacyText);
  assert.match(await scanPage.locator('#active-list').innerText(),/Expected time not set/);
  await unlock(scanPage);assert.match(await scanPage.locator('#active-list').innerText(),/LEGACY TEST STUDENT/);
  await scanPage.locator('[data-mode=return]').click();await manual(scanPage,12);await message(scanPage,'finished / returned');
  assert.equal((await saved(scanPage)).trips[0].student,'LEGACY TEST STUDENT');
  assert.deepEqual(await scanPage.evaluate(()=>[localStorage.getItem('circ-hall-pass-demo-v1'),localStorage.getItem('unrelated-test-data')]),['old-demo-kept','kept']);
  assert.deepEqual(scanErrors,[]);assert.deepEqual(remoteRequests,[]);await scanContext.close();
  for(const viewport of [{width:768,height:1024},{width:390,height:844}]){
    const mobile=await browser.newContext({viewport,hasTouch:true,isMobile:true}),p=await mobile.newPage();const pageErrors=[];p.on('pageerror',e=>pageErrors.push(e.message));
    await p.goto(url);await unlock(p,true);await approve(p,7,'TOUCH-TEST');await manual(p,7);await message(p,'visit registered');
    const width=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(width.scroll<=width.viewport+1,JSON.stringify(width));
    console.log('layout',viewport.width,await p.evaluate(()=>({active:document.activeElement.id||document.activeElement.tagName,skipTop:getComputedStyle(document.querySelector('.skip')).top,skipFocus:document.querySelector('.skip').matches(':focus-visible'),scrollY})));await p.screenshot({path:path.join(os.tmpdir(),`passdesk-${viewport.width}-check.png`),fullPage:true});assert.deepEqual(pageErrors,[]);await mobile.close();
  }
  console.log('PASS: scheduled named visits; Register / Arrive / Finish; manual, unfocused and wrapped scanner input; rejected/empty/duplicate scans; staff-field isolation; name privacy; private export/restore; legacy record preservation; reload; failed write; second tab; hidden-page and three-minute lock; 768px and 390px touch layouts; no external requests or page errors.');
  console.log('Screenshots in '+os.tmpdir()+': passdesk-desktop-check.png; passdesk-768-check.png; passdesk-390-check.png; circ-check-in-staff-check.png; circ-check-in-complete-check.png');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
