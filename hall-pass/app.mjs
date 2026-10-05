import {STORAGE_KEY,STAFF_KEY,createState,parseState,normalizePass,approvePass,scanPass,cancelApproval,status,isOpen,dayKey,ZONE} from './model.mjs?v=2';
import {createStore} from './storage.mjs?v=2';
import {createScanner} from './scanner.mjs?v=2';
import {code39} from './barcode.mjs?v=2';
const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
let state=createState(),ready=false,busy=false,unlocked=false,staffUnlockedAt=0,action='depart',store,pinRecord=null,pinError=false,staffTimer=null;
const clock=ms=>ms===null?'—':new Date(ms).toLocaleTimeString([], {timeZone:ZONE,hour:'numeric',minute:'2-digit'});
const stamp=ms=>new Date(ms).toLocaleString([], {timeZone:ZONE,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const feedback=(message,error=false)=>{$('message').textContent=message;$('message').className='feedback scan-feedback'+(error?' error':'');};
function controls(){ $('scan-submit').disabled=!ready||busy;$('approve-button').disabled=!ready||busy||!unlocked;document.querySelectorAll('[data-cancel]').forEach(b=>b.disabled=busy||!ready||!unlocked); }
function lockStaff(){clearTimeout(staffTimer);staffTimer=null;unlocked=false;$('staff-panel').hidden=true;$('staff-history').hidden=true;$('staff-access').hidden=true;$('staff-toggle').textContent='Staff access';$('pin').value='';$('pin-confirm').value='';$('student-code').value='';$('approval-confirm').checked=false;render();}
function showAccess(){
  if(unlocked){lockStaff();feedback('Staff controls locked. Approved cards can still be scanned.');return;}
  $('staff-access').hidden=!$('staff-access').hidden;
  $('pin-confirm-wrap').hidden=!!pinRecord;
  $('access-title').textContent=pinRecord?'Staff access':'Set up this desk';
  $('pin-help').textContent=pinError?'The saved staff setup could not be read. Do not clear records without a private backup.':pinRecord?'Enter your PIN to approve cards and view private history.':'Choose a 6–12 digit PIN for staff controls. Keep it somewhere private; this app has no online recovery.';
  $('pin-submit').disabled=pinError;$('pin-submit').textContent=pinRecord?'Unlock staff controls':'Save PIN and open staff controls';
  if(!$('staff-access').hidden)$('pin').focus();
}
async function pinHash(pin,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt),iterations:150000},key,256);return Array.from(new Uint8Array(bits),n=>n.toString(16).padStart(2,'0')).join('');}
function readPin(){
  try{const value=localStorage.getItem(STAFF_KEY);if(value===null){pinRecord=null;return;}const p=JSON.parse(value);if(p?.version!==1||!Array.isArray(p.salt)||p.salt.length!==16||!p.salt.every(v=>Number.isInteger(v)&&v>=0&&v<256)||!/^[a-f0-9]{64}$/.test(p.hash))throw Error('Invalid staff setup.');pinRecord=p;}
  catch{pinError=true;}
}
$('staff-toggle').addEventListener('click',showAccess);
$('pin-form').addEventListener('submit',async event=>{
  event.preventDefault();const pin=$('pin').value;if(!/^\d{6,12}$/.test(pin)){feedback('Use a PIN with 6–12 digits.',true);return;}
  $('pin-submit').disabled=true;
  try{
    if(pinError)throw Error('Staff setup is unavailable. Saved records were not changed.');
    // Serialize setup across tabs so a second setup cannot replace the first PIN.
    if(!navigator.locks?.request)throw Error('Update this browser to use secure saved operations.');
    await navigator.locks.request(STAFF_KEY,async()=>{
      const existing=localStorage.getItem(STAFF_KEY);
      if(existing!==null){readPin();if(pinError||!pinRecord)throw Error('Staff setup could not be read.');if(await pinHash(pin,pinRecord.salt)!==pinRecord.hash)throw Error('That PIN did not match.');}
      else{if(pin!==$('pin-confirm').value)throw Error('The two PINs do not match.');const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));const record={version:1,salt,hash:await pinHash(pin,salt)};
        await navigator.locks.request(STORAGE_KEY+':transaction',()=>{const raw=localStorage.getItem(STORAGE_KEY);if(raw!==null&&JSON.parse(raw).trips?.length)throw Error('Records exist without their staff setup. Keep a backup; do not replace the staff setup here.');if(raw===null)localStorage.setItem(STORAGE_KEY,JSON.stringify(createState()));});
        localStorage.setItem(STAFF_KEY,JSON.stringify(record));pinRecord=record;}
    });
    unlocked=true;staffUnlockedAt=Date.now();clearTimeout(staffTimer);staffTimer=setTimeout(lockStaff,180000);$('staff-access').hidden=true;$('staff-panel').hidden=false;$('staff-history').hidden=false;$('staff-toggle').textContent='Lock staff controls';$('pin').value='';$('pin-confirm').value='';feedback('Staff controls open for three minutes. Approve a card before activating departure.');await load();render();
  }catch(error){feedback(error.message,true);}finally{$('pin-submit').disabled=false;}
});
function render(){
  const now=Date.now();$('today').textContent=new Date(now).toLocaleDateString([], {timeZone:ZONE,weekday:'long',month:'short',day:'numeric'});
  const open=state.trips.filter(t=>isOpen(t,now));$('active-count').textContent=ready?String(open.length):'—';$('available-count').textContent=ready?String(100-new Set(open.map(t=>t.pass)).size):'—';
  $('active-list').replaceChildren();
  if(!open.length)$('active-list').append(node('div','empty',ready?'No open cards. Staff can approve the next trip.':'Saved records are unavailable. No new trip will be recorded.'));
  for(const trip of open){
    const card=node('article','trip'),top=node('div','trip-top');top.append(node('strong','pass-id',trip.pass),node('span','out-badge'+(status(trip,now).includes('overdue')?' overdue':''),status(trip,now)));card.append(top,node('div','trip-student',unlocked?trip.student:trip.destination),node('div','trip-meta',`${unlocked?trip.destination+' · ':''}expires ${clock(trip.expiresAt)}`));
    if(trip.departedAt!==null)card.append(node('div','trip-meta',`Departed ${clock(trip.departedAt)} · arrived ${clock(trip.arrivedAt)}`));
    if(unlocked&&trip.departedAt===null){const cancel=node('button','secondary','Cancel approval');cancel.type='button';cancel.dataset.cancel=trip.id;cancel.addEventListener('click',()=>transact(s=>cancelApproval(s,trip.id,unlocked),'Unused approval cancelled.'));card.append(cancel);}
    $('active-list').append(card);
  }
  $('history-count').textContent=String(state.trips.length);$('history-list').replaceChildren();
  if(unlocked)for(const trip of [...state.trips].reverse()){
    const row=node('div','history-row'),a=node('div'),b=node('div');a.append(node('strong','',trip.pass),node('span','',`${trip.student} → ${trip.destination}`),node('div','',`${status(trip,now)} · approved ${stamp(trip.approvedAt)}`));b.append(node('div','',`Depart ${clock(trip.departedAt)} · Arrive ${clock(trip.arrivedAt)} · Return ${clock(trip.returnedAt)}`));row.append(a,b);$('history-list').append(row);
  }
  controls();
}
async function load(){
  try{store??=createStore(localStorage,navigator.locks);state=await store.load();if(pinRecord&&localStorage.getItem(STORAGE_KEY)===null)throw Error('This desk was set up, but its trip records are missing. Restore a private backup before continuing.');ready=true;$('storage-status').textContent=pinRecord?'Saved on this device · New York school date · staff permission required':'New desk · open Staff access to set up this device';$('storage-status').className='notice';}
  catch(error){ready=false;$('storage-status').textContent=error.message+' Saved records have not been reset.';$('storage-status').className='notice error';}
  render();
}
async function transact(mutator,success){
  if(busy||!ready){feedback(ready?'Please wait for the previous scan to finish.':'Saved records are unavailable. Tap staff access to retry.',true);return false;}
  busy=true;controls();
  try{const result=await store.change(mutator);state=result.state;feedback(result.message||success);render();return true;}
  catch(error){feedback(error.message+' Nothing from this attempt was recorded.',true);await load();return false;}
  finally{busy=false;controls();}
}
async function recordScan(value){if(!String(value).trim())return;$('scan-number').value='';let card;try{card=normalizePass(value);}catch(error){feedback(error.message,true);return;}await transact(s=>scanPass(s,card,action));}
$('scan-form').addEventListener('submit',event=>{event.preventDefault();recordScan($('scan-number').value);});
function selectAction(next,announce=true){action=next;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===action)));$('scan-submit').textContent={depart:'Record departure',arrive:'Record arrival',return:'Record return'}[action];if(announce)feedback(`${{depart:'Depart',arrive:'Arrive',return:'Return'}[action]} selected. Scan a card or type its number.`);}
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>selectAction(button.dataset.mode));
$('approval-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!unlocked||Date.now()-staffUnlockedAt>180000){lockStaff();feedback('Unlock staff controls to approve a card.',true);return;}if(!$('approval-confirm').checked){feedback('Confirm teacher permission first.',true);return;}
  const request={pass:$('approval-pass').value,student:$('student-code').value,destination:$('destination').value,minutes:$('valid-for').value==='day'?'day':Number($('valid-for').value),staffApproved:unlocked};
  let card;try{card=normalizePass(request.pass);}catch(error){feedback(error.message,true);return;}
  if(await transact(s=>approvePass(s,request),`${card} approved. Staff controls locked. Depart is ready; scan to activate.`)){$('approval-pass').value='';lockStaff();selectAction('depart',false);}
});
// Global capture does not require a spreadsheet cell or one particular field.
const scanner=createScanner();let editStart=null,lastKey=0;
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.type==='password'){scanner.reset();return;}
  const now=performance.now(),editable=event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement;
  if(now-lastKey>250)editStart=editable?{target:event.target,value:event.target.value}:null;lastKey=now;
  if(event.target===$('scan-number')&&(event.key==='Enter'||event.key==='Tab')){scanner.reset();if(event.key==='Tab'&&!$('scan-number').value.trim())return;event.preventDefault();recordScan($('scan-number').value);return;}
  if(event.target===$('approval-pass')&&(event.key==='Enter'||event.key==='Tab')){if(!$('approval-pass').value.trim())return;event.preventDefault();scanner.reset();try{$('approval-pass').value=normalizePass($('approval-pass').value);$('student-code').focus();}catch(error){feedback(error.message,true);}return;}
  const value=scanner.feed(event.key,now);
  if(value&&editable&&!/^CIRC-/i.test(value))return;
  if(value){event.preventDefault();event.stopPropagation();if(editStart?.target===event.target)event.target.value=editStart.value;if(editable){feedback('Staff field kept unchanged. Use the scan box or finish editing before recording a trip.');return;}recordScan(value);}
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)lockStaff();else load();});
window.addEventListener('storage',event=>{if(event.key===STAFF_KEY||event.key===null){lockStaff();pinError=false;readPin();}if(event.key===STORAGE_KEY||event.key===null)load();});
$('retry-storage').addEventListener('click',load);
$('export-data').addEventListener('click',()=>{
  if(!unlocked)return;
  try{const raw=localStorage.getItem(STORAGE_KEY);const blob=new Blob([raw??JSON.stringify(createState())],{type:'application/json'});const link=node('a');link.href=URL.createObjectURL(blob);link.download=`PassDesk-private-backup-${dayKey()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);feedback('Private backup downloaded. It contains student codes; keep it private.');}catch(error){feedback('Backup failed: '+error.message,true);}
});
$('restore-file').addEventListener('change',async event=>{
  const file=event.target.files[0];event.target.value='';if(!file||!unlocked||busy)return;
  busy=true;controls();
  try{
    if(file.size>2000000)throw Error('Choose a PassDesk JSON backup under 2 MB.');
    const restored=parseState(await file.text());
    if(!unlocked||Date.now()-staffUnlockedAt>180000)throw Error('Unlock staff controls again before restoring.');
    if(!confirm(`Replace this device’s trip records with ${restored.trips.length} trips from this backup? Current approvals and open trips will be replaced. The staff PIN and old demo stay unchanged.`))return;
    await navigator.locks.request(STORAGE_KEY+':transaction',()=>{
      if(!unlocked||Date.now()-staffUnlockedAt>180000)throw Error('Staff controls locked before restore.');
      localStorage.setItem(STORAGE_KEY,JSON.stringify(restored));
    });
    state=restored;await load();lockStaff();feedback('Private backup restored on this device. Check open cards before resuming.');
  }catch(error){feedback('Backup was not restored: '+error.message,true);}finally{busy=false;controls();}
});
function barcode(text){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),encoded=code39(text);for(const bar of encoded.bars){const rect=document.createElementNS(svg.namespaceURI,'rect');rect.setAttribute('x',bar.x);rect.setAttribute('y','0');rect.setAttribute('width',bar.width);rect.setAttribute('height','42');svg.append(rect);}svg.setAttribute('viewBox',`0 0 ${encoded.width} 42`);svg.setAttribute('aria-label',text);return svg;}
$('print-cards').addEventListener('click',()=>{if(!unlocked)return;const sheet=$('print-sheet');sheet.replaceChildren();for(let n=1;n<=100;n++){const pass=normalizePass(n),card=node('div','printed-card');card.append(node('strong','',pass),barcode(pass),node('span','','CIRC / ECTV · reusable card'));sheet.append(card);}window.print();});
setInterval(()=>{if(unlocked&&Date.now()-staffUnlockedAt>180000)lockStaff();render();},15000);
readPin();load();
