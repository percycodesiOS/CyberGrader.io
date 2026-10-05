import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,LEGACY_KEY,createState,normalizePass,dayKey,nextMidnight,validateState,parseState,approvePass,scanPass,cancelApproval,status,isOpen} from './model.mjs';
import {createStore} from './storage.mjs';
import {createScanner} from './scanner.mjs';
import {code39} from './barcode.mjs';
const NOW=Date.parse('2026-10-05T12:00:00Z');
const request=(overrides={})=>({pass:1,student:'TEST-A',destination:'CIRC',minutes:60,staffApproved:true,...overrides});
const approved=(overrides={})=>approvePass(createState(),request(overrides),NOW);
test('all 100 cards normalize; malformed and out of range codes reject',()=>{
  for(let i=1;i<=100;i++)assert.equal(normalizePass(i),`CIRC-${String(i).padStart(3,'0')}`);
  for(const bad of [0,101,-1,1.5,'1e2','CIRC-000','CIRC-001x','ECTV-001','',null])assert.throws(()=>normalizePass(bad));
});
test('only explicit staff approval can create permission; unknown student/destination rejected',()=>{
  for(const staffApproved of [false,undefined,'true',1])assert.throws(()=>approved({staffApproved}),/staff/i);
  assert.throws(()=>approved({student:''}));assert.throws(()=>approved({destination:'office'}));
  for(const action of ['depart','arrive','return'])assert.throws(()=>scanPass(createState(),1,action,NOW),/no staff approval/);
});
test('approval, departure, arrival, return and reuse preserve separate timestamps',()=>{
  let state=approved();const original=JSON.stringify(state);
  state=scanPass(state,1,'depart',NOW+1000).state;assert.equal(status(state.trips[0],NOW+1000),'On the way');
  state=scanPass(state,1,'arrive',NOW+2000).state;assert.equal(status(state.trips[0],NOW+2000),'Arrived');
  state=scanPass(state,1,'return',NOW+3000).state;assert.equal(status(state.trips[0],NOW+3000),'Returned');
  assert.equal(JSON.parse(original).trips[0].departedAt,null);
  state=approvePass(state,request({student:'TEST-B'}),NOW+4000);assert.equal(state.trips.length,2);assert.equal(state.trips[1].departedAt,null);
});
test('arrival cannot activate a card; return can close a trip with a missed arrival',()=>{
  assert.throws(()=>scanPass(approved(),1,'arrive',NOW+1),/not been activated/);
  const out=scanPass(approved(),1,'depart',NOW+1).state;
  const back=scanPass(out,1,'return',NOW+2).state;assert.equal(back.trips[0].arrivedAt,null);assert.equal(back.trips[0].returnedAt,NOW+2);
});
test('repeat scans do not advance another stage or add history',()=>{
  for(const action of ['depart','arrive','return']){
    let state=approved();state=scanPass(state,1,'depart',NOW+1).state;
    if(action!=='depart')state=scanPass(state,1,'arrive',NOW+2).state;
    if(action==='return')state=scanPass(state,1,'return',NOW+3).state;
    const repeated=scanPass(state,1,action,NOW+4);assert.deepEqual(repeated.state,state);assert.match(repeated.message,/already recorded/);
  }
});
test('a returned card cannot display successful departure or arrival without new permission',()=>{
  const out=scanPass(approved(),1,'depart',NOW+1).state,back=scanPass(out,1,'return',NOW+2).state;
  assert.throws(()=>scanPass(back,1,'depart',NOW+3),/closed/);assert.throws(()=>scanPass(back,1,'arrive',NOW+3),/closed/);
  assert.match(scanPass(back,1,'return',NOW+3).message,/already recorded/);
});
test('same card and case-insensitive student cannot have concurrent permissions',()=>{
  const state=approved();assert.throws(()=>approvePass(state,request({student:'TEST-B'}),NOW+1),/already/);
  assert.throws(()=>approvePass(state,request({pass:2,student:'test-a'}),NOW+1),/already/);
});
test('New York date is used independent of host time zone',()=>{
  assert.equal(dayKey(Date.parse('2026-10-06T03:59:59Z')),'2026-10-05');
  assert.equal(dayKey(Date.parse('2026-10-06T04:00:00Z')),'2026-10-06');
});
test('DST spring and fall days end at the correct New York midnight',()=>{
  const spring=Date.parse('2026-03-08T05:00:00Z'),fall=Date.parse('2026-11-01T04:00:00Z');
  assert.equal(nextMidnight(spring)-spring,23*3600000);assert.equal(nextMidnight(fall)-fall,25*3600000);
});
test('approval expiry is exclusive, including exact midnight and rest-of-day',()=>{
  const start=Date.parse('2026-10-06T03:59:00Z');const state=approvePass(createState(),request({minutes:'day'}),start);
  assert.equal(state.trips[0].expiresAt,Date.parse('2026-10-06T04:00:00Z'));
  assert.throws(()=>scanPass(state,1,'depart',state.trips[0].expiresAt),/expired/);
  assert.equal(scanPass(state,1,'depart',state.trips[0].expiresAt-1).state.trips[0].departedAt,state.trips[0].expiresAt-1);
  assert.throws(()=>scanPass(approved({minutes:5}),1,'depart',NOW+300000),/expired/);
});
test('expired unused card can receive new approval, but overdue open trip remains occupied',()=>{
  const state=approved({minutes:5});assert.equal(status(state.trips[0],NOW+300000),'Expired');
  assert.equal(approvePass(state,request({student:'TEST-B'}),NOW+300001).trips.length,2);
  const out=scanPass(state,1,'depart',NOW+1).state;
  assert.ok(isOpen(out.trips[0],NOW+300001));assert.throws(()=>approvePass(out,request({student:'TEST-B'}),NOW+300001));
  const late=scanPass(out,1,'arrive',NOW+300002);assert.match(late.message,/after expiry/);assert.match(status(late.trip,NOW+300002),/overdue/);
  assert.equal(scanPass(late.state,1,'return',NOW+300003).trip.returnedAt,NOW+300003);
});
test('cancel requires staff and cannot hide a departed student',()=>{
  const state=approved(),id=state.trips[0].id;
  assert.throws(()=>cancelApproval(state,id,false,NOW+1));
  const cancelled=cancelApproval(state,id,true,NOW+1);assert.equal(status(cancelled.trips[0],NOW+1),'Cancelled');assert.throws(()=>scanPass(cancelled,1,'depart',NOW+2));
  assert.throws(()=>cancelApproval(scanPass(state,1,'depart',NOW+1).state,id,true,NOW+2));
});
test('corrupt, overlapping, future-version records reject without mutation',()=>{
  for(const bad of ['{','null','[]','{"version":1,"revision":0,"trips":[]}'])assert.throws(()=>parseState(bad));
  const state=approved(),copy=structuredClone(state);copy.trips.push({...copy.trips[0],id:'trip-999-2'});assert.throws(()=>validateState(copy),/Overlapping/);
  assert.equal(state.trips.length,1);assert.throws(()=>scanPass(scanPass(state,1,'depart',NOW+100).state,1,'arrive',NOW+99),/clock/);
});
function harness(){const data=new Map([[LEGACY_KEY,'legacy-demo-untouched']]);let queue=Promise.resolve();const locks={request:(_,fn)=>{const job=queue.then(fn);queue=job.catch(()=>{});return job;}};const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};return {data,storage,locks,store:createStore(storage,locks)};}
test('storage reload preserves trip and the old demo key',async()=>{
  const h=harness();await h.store.change(s=>approvePass(s,request(),NOW));await h.store.change(s=>scanPass(s,1,'depart',NOW+1));
  assert.equal((await createStore(h.storage,h.locks).load()).trips[0].departedAt,NOW+1);assert.equal(h.data.get(LEGACY_KEY),'legacy-demo-untouched');
});
test('two tabs competing for a card serialize; repeated simultaneous scans are idempotent',async()=>{
  const h=harness(),other=createStore(h.storage,h.locks);
  const approvals=await Promise.allSettled([h.store.change(s=>approvePass(s,request(),NOW)),other.change(s=>approvePass(s,request({student:'TEST-B'}),NOW))]);
  assert.equal(approvals.filter(x=>x.status==='fulfilled').length,1);
  await Promise.all([h.store.change(s=>scanPass(s,1,'depart',NOW+1)),other.change(s=>scanPass(s,1,'depart',NOW+1))]);
  const state=await h.store.load();assert.equal(state.trips.length,1);assert.equal(state.revision,2);
});
test('failed write reports failure and leaves previous saved state intact',async()=>{
  const h=harness();await h.store.change(s=>approvePass(s,request(),NOW));const before=h.data.get(STORAGE_KEY);
  h.storage.setItem=()=>{throw Error('QuotaExceededError');};await assert.rejects(h.store.change(s=>scanPass(s,1,'depart',NOW+1)),/Quota/);
  assert.equal(h.data.get(STORAGE_KEY),before);assert.equal((await h.store.load()).trips[0].departedAt,null);
});
test('inaccessible storage, corrupt JSON and absent locks never silently fall back',async()=>{
  const h=harness();h.data.set(STORAGE_KEY,'{');await assert.rejects(h.store.load());assert.equal(h.data.get(STORAGE_KEY),'{');
  h.storage.getItem=()=>{throw Error('denied');};await assert.rejects(h.store.load(),/denied/);
  assert.throws(()=>createStore(h.storage,{}).load(),/Web Locks/);
});
test('scanner handles prefixed/numeric bursts, Enter/Tab, and ignores slow free typing',()=>{
  function feed(text,delay=10,suffix='Enter'){const s=createScanner();let now=1000;for(const key of text){s.feed(key,now);now+=delay;}return s.feed(suffix,now);}
  assert.equal(feed('CIRC-001'),'CIRC-001');assert.equal(feed('042',10,'Tab'),'042');assert.equal(feed('042',180),null);assert.equal(feed('CIRC-001',180),null);assert.equal(feed('hello'),null);
});
test('printed Code 39 encodes all 100 unique card texts with known CIRC patterns',()=>{
  const expected={'*':0x094,C:0x148,I:0x04c,R:0x106,'-':0x085,'0':0x034,'1':0x121,'2':0x061,'3':0x160,'4':0x031,'5':0x130,'6':0x070,'7':0x025,'8':0x124,'9':0x064};
  for(let n=1;n<=100;n++){
    const text=normalizePass(n),{bars,width}=code39(text);assert.equal(bars.length,50);assert.ok(width>150);
    const chars='*'+text+'*';let index=0;
    for(const char of chars){let bits=0;for(let k=0;k<5;k++){const bar=bars[index++];bits=(bits<<1)|(bar.width===3?1:0);if(k<4){const gap=bars[index].x-(bar.x+bar.width);bits=(bits<<1)|(gap===3?1:0);}}assert.equal(bits,expected[char]);}
  }
  assert.throws(()=>code39('CIRC-101'));
});
test('history keeps 200 closed trips and does not prune an open trip',()=>{
  let state=approvePass(createState(),request({pass:100,student:'OPEN-TEST',minutes:'day'}),NOW);
  state=scanPass(state,100,'depart',NOW+1).state;
  for(let i=0;i<205;i++){
    const now=NOW+100+i*10;
    state=approvePass(state,request(),now);state=scanPass(state,1,'depart',now+1).state;state=scanPass(state,1,'return',now+2).state;
  }
  assert.equal(state.trips.length,201);assert.equal(state.trips.filter(t=>t.returnedAt!==null).length,200);assert.equal(state.trips[0].pass,'CIRC-100');
});
