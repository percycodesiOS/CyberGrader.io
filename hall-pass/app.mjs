import {STUDENTS, DESTINATIONS, STORAGE_KEY, createState, parseState, validateState, normalizePass, issuePass, returnPass, getActive} from './model.mjs';
const $ = id => document.getElementById(id);
const LOCK = STORAGE_KEY + ':transaction';
const learner = id => STUDENTS.find(s => s.id === id);
const time = ms => new Date(ms).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const dateTime = ms => new Date(ms).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
let state = createState(), mode = 'blocked', busy = false;
const el = (tag, cls, text) => { const node = document.createElement(tag); if(cls) node.className = cls; if(text !== undefined) node.textContent = text; return node; };
function say(text, error=false) { $('message').textContent=text; $('message').className='feedback'+(error?' error':''); }
function storageMessage(text, kind='') { $('storage-status').textContent=text; $('storage-status').className='notice'+(kind?' '+kind:''); $('recovery').hidden=kind!== 'error'; }
function elapsed(ms) { const secs=Math.max(0,Math.floor(ms/1000)); if(secs<60) return 'Less than a minute'; const mins=Math.floor(secs/60); return mins<60 ? mins+' min' : Math.floor(mins/60)+' hr '+mins%60+' min'; }
function updateTimers() { document.querySelectorAll('[data-issued]').forEach(node=>node.textContent=elapsed(Date.now()-Number(node.dataset.issued))+' out'); }
function controls() { $('issue-button').disabled=busy||mode==='blocked'; $('reset-demo').disabled=busy; document.querySelectorAll('[data-return]').forEach(b=>b.disabled=busy||mode==='blocked'); }
function returnButton(trip, prefix='Return') { const b=el('button','return-button',prefix); b.type='button'; b.dataset.return=trip.id; b.setAttribute('aria-label','Return '+trip.pass); b.addEventListener('click',()=>returnTrip(trip)); return b; }
function renderSelected(showInvalid=false) {
 const box=$('selected-pass'); box.replaceChildren(); box.hidden=true;
 if(!$('pass-number').value.trim()) return;
 let pass; try {pass=normalizePass($('pass-number').value);} catch(e) { if(showInvalid) say(e.message,true); return; }
 const trip=getActive(state).find(t=>t.pass===pass);
 box.hidden=false;
 if(trip){box.append(el('strong','',pass+' is already out.'),el('div','',learner(trip.studentId).label+' · '+trip.destination)); box.append(returnButton(trip,'Return this pass')); }
 else box.append(el('strong','',pass),document.createTextNode(mode==='blocked'?' · saved status unavailable':' · available for a new trip'));
 controls();
}
function render() {
 const active=getActive(state).sort((a,b)=>a.issuedAt-b.issuedAt);
 $('active-count').textContent=mode==='blocked'?'—':String(active.length);
 $('available-count').textContent=mode==='blocked'?'—':String(100-active.length);
 const list=$('active-list'); list.replaceChildren();
 if(!active.length){
  const empty=el('div','empty'); empty.append(el('div','empty-symbol','↩'),el('h3','',mode==='blocked'?'Check saved data first':'Every pass is home.'),el('p','',mode==='blocked'?'Resolve the storage notice above before issuing a pass.':'Issued cards will appear here with the sample student, destination and time out.')); list.append(empty);
 }
 for(const trip of active){
  const card=el('article','trip'); card.dataset.trip=trip.id;
  const top=el('div','trip-top'); top.append(el('span','pass-id',trip.pass),el('span','out-badge','OUT'));
  const body=el('div','trip-body'), detail=el('div'); const s=learner(trip.studentId);
  detail.append(el('div','trip-student',s.label),el('div','trip-meta',s.homeroom+' → '+trip.destination),el('div','trip-meta','Issued '+dateTime(trip.issuedAt)));
  const timer=el('div','trip-elapsed');timer.dataset.issued=String(trip.issuedAt);detail.append(timer);body.append(detail,returnButton(trip));card.append(top,body);list.append(card);
 }
 const history=state.trips.filter(t=>t.returnedAt!==null).sort((a,b)=>b.returnedAt-a.returnedAt);
 $('history-count').textContent=String(history.length);$('history-list').replaceChildren();
 if(!history.length)$('history-list').append(el('div','history-empty','No returns yet. The same card can start another trip after it comes back.'));
 for(const trip of history){
  const row=el('div','history-row');const a=el('div');a.append(el('strong','',trip.pass),document.createTextNode(learner(trip.studentId).label+' → '+trip.destination));
  const b=el('div');b.append(document.createTextNode(dateTime(trip.issuedAt)+' → '+dateTime(trip.returnedAt)),el('div','',elapsed(trip.returnedAt-trip.issuedAt)+' total'));row.append(a,b);$('history-list').append(row);
 }
 updateTimers();renderSelected();controls();
}
function block(error, operation='Saved data could not be loaded.') { mode='blocked'; storageMessage(operation+' Nothing from this operation was saved. '+error.message+' Retry, reset this demo, or use a temporary demo.','error'); say(operation,true); render(); }
async function load() {
 if(mode==='temporary')return;
 try {
  if(!navigator.locks?.request) throw Error('This browser cannot safely coordinate multiple tabs.');
  await navigator.locks.request(LOCK,()=>{
   state=parseState(localStorage.getItem(STORAGE_KEY)); mode='saved';
   storageMessage('Browser storage ready · sample trips stay on this browser. Other devices do not sync.');
   render();
  });
 } catch(error){block(error);}
}
async function change(mutator, success) {
 if(busy||mode==='blocked')return;
 busy=true;controls();
 try {
  if(mode==='temporary') {
   state=validateState(mutator(state));render();say(success+' Temporary only; not saved.');
  } else {
   await navigator.locks.request(LOCK,()=>{
    const latest=parseState(localStorage.getItem(STORAGE_KEY));
    const next=validateState(mutator(latest));
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); }
    catch(error){error.storageFailure=true;throw error;}
    state=next;mode='saved';storageMessage('Saved in this browser · updated '+time(Date.now())+'. Other devices do not sync.');render();say(success);
   });
  }
 } catch(error) {
  // A validation rejection does not discard existing data. Reload the latest
  // value so a second tab's successful transaction remains visible.
  if(error.storageFailure){block(error,'This change could not be saved.');}
  else {
   try { if(mode!=='temporary'){state=parseState(localStorage.getItem(STORAGE_KEY));render();} say(error.message,true); }
   catch(storageError){block(storageError);}
  }
 } finally {busy=false;controls();}
}
async function returnTrip(trip) {
 await change(s=>returnPass(s,trip.id,Date.now()),trip.pass+' returned. It is available for another trip.');
 renderSelected();
}
$('today').textContent=new Date().toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'});
for(const groupName of ['Sample homeroom 1','Sample homeroom 2']){
 const group=el('optgroup');group.label=groupName;
 for(const s of STUDENTS.filter(s=>s.homeroom===groupName)){const option=el('option','',s.label);option.value=s.id;group.append(option);}
 $('student').append(group);
}
$('pass-number').addEventListener('input',()=>renderSelected());
$('pass-number').addEventListener('keydown',event=>{
 if(event.key==='Enter'){event.preventDefault();try{$('pass-number').value=normalizePass($('pass-number').value);say('Card selected. Choose Issue pass or Return to record an action.');renderSelected(true);}catch(error){say(error.message,true);}}
});
$('issue-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||mode==='blocked')return;
 const request={pass:$('pass-number').value,studentId:$('student').value,destination:$('destination').value,approved:$('approval').checked};
 let pass;try{pass=normalizePass(request.pass);}catch(error){say(error.message,true);$('pass-number').focus();return;}
 const before=state.revision;
 await change(s=>issuePass(s,request,Date.now()),pass+' issued. Mark it returned when the card comes back.');
 if(state.revision!==before && getActive(state).some(t=>t.pass===pass&&t.studentId===request.studentId)){
  $('approval').checked=false;$('student').value='';$('pass-number').value='';renderSelected();$('pass-number').focus();
 }
});
$('retry-storage').addEventListener('click',()=>{mode='blocked';load();});
$('temporary-mode').addEventListener('click',()=>{
 if(!confirm('Start a separate temporary sample demo? Saved data stays untouched. Changes in this tab will be lost on reload and will not appear in other tabs.'))return;
 state=createState();mode='temporary';storageMessage('TEMPORARY DEMO · this tab only. Nothing is saved; reload loses these trips. Other tabs do not share this temporary state.','warning');say('Temporary practice ready. Saved browser data is untouched.');render();
});
$('reset-demo').addEventListener('click',async()=>{
 if(busy||!confirm('Reset all sample trips in this demo? This clears only the CIRC Pass Desk demo, not other apps or browser data.'))return;
 busy=true;controls();
 try {
  if(mode==='temporary'){state=createState();say('Temporary demo reset. Saved data was untouched.');render();}
  else {
   if(!navigator.locks?.request)throw Error('Use a current browser to reset saved demo data safely.');
   await navigator.locks.request(LOCK,()=>{
    localStorage.removeItem(STORAGE_KEY);state=createState();mode='saved';storageMessage('Demo reset in this browser. Other apps’ saved data is untouched.');say('All 100 demo passes are available again.');render();
   });
  }
 } catch(error){block(error,'Demo reset failed.');}
 finally{busy=false;controls();}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null){if(mode!=='temporary')load();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode!=='temporary'&&!busy)load();});
setInterval(updateTimers,15000);
load();

