// Local, supervised PassDesk. No student records or network calls in this module.
export const STORAGE_KEY = 'circ-passdesk-v2';
export const STAFF_KEY = 'circ-passdesk-staff-v1';
export const LEGACY_KEY = 'circ-hall-pass-demo-v1';
export const ZONE = 'America/New_York';
export const DESTINATIONS = Object.freeze(['CIRC', 'ECTV']);
const formatter = new Intl.DateTimeFormat('en-CA', {timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const fail = message => { throw Error(message); };
const time = value => { if (!Number.isSafeInteger(value) || value <= 0 || value > 8640000000000000) fail('Invalid time.'); return value; };
const keys = (object, expected) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).sort().join('|') === [...expected].sort().join('|');
const cleanText = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 40 && !/[\u0000-\u001f\u007f]/.test(value);
const midnightCache=new Map();
export function dayKey(now=Date.now()) {
  const parts=Object.fromEntries(formatter.formatToParts(time(now)).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
// Next New York midnight, including 23/25-hour DST days.
export function nextMidnight(now) {
  const day=dayKey(now);if(midnightCache.has(day))return midnightCache.get(day);let low=now,high=now+30*3600000;
  while(high-low>1){const mid=Math.floor((high+low)/2);if(dayKey(mid)===day)low=mid;else high=mid;}
  midnightCache.set(day,high);return high;
}
export function normalizePass(value) {
  const match=/^(?:CIRC-)?(\d{1,3})$/i.exec(String(value).trim());
  if(!match||+match[1]<1||+match[1]>100)fail('Use a card number from 1 to 100, such as CIRC-001.');
  return `CIRC-${String(+match[1]).padStart(3,'0')}`;
}
export const createState=()=>({version:2,revision:0,trips:[]});
const fields=['id','pass','student','destination','approvedAt','expiresAt','departedAt','arrivedAt','returnedAt','cancelledAt'];
export function validateState(raw) {
  if(!keys(raw,['version','revision','trips'])||raw.version!==2||!Number.isSafeInteger(raw.revision)||raw.revision<0||!Array.isArray(raw.trips)||raw.trips.length>500)fail('Saved PassDesk data is not valid. Keep a backup before resetting it.');
  const ids=new Set(),activePasses=new Set();
  const trips=raw.trips.map(t=>{
    if(!keys(t,fields)||typeof t.id!=='string'||!/^trip-[0-9]+-[0-9]+$/.test(t.id)||ids.has(t.id))fail('Invalid or duplicate saved trip.');
    ids.add(t.id);
    if(normalizePass(t.pass)!==t.pass||!cleanText(t.student)||!DESTINATIONS.includes(t.destination))fail('Invalid saved card, student code or destination.');
    time(t.approvedAt);time(t.expiresAt);
    if(t.expiresAt<=t.approvedAt||t.expiresAt>nextMidnight(t.approvedAt))fail('Approval must expire within its New York school date.');
    for(const name of ['departedAt','arrivedAt','returnedAt','cancelledAt'])if(t[name]!==null)time(t[name]);
    if(t.departedAt!==null&&(t.departedAt<t.approvedAt||t.departedAt>=t.expiresAt))fail('Invalid departure time.');
    if(t.arrivedAt!==null&&(t.departedAt===null||t.arrivedAt<t.departedAt))fail('Arrival needs an earlier departure.');
    if(t.returnedAt!==null&&(t.departedAt===null||t.returnedAt<(t.arrivedAt??t.departedAt)))fail('Return needs an earlier departure or arrival.');
    if(t.cancelledAt!==null&&(t.departedAt!==null||t.cancelledAt<t.approvedAt))fail('Only unused approvals may be cancelled.');
    if(t.departedAt!==null&&t.returnedAt===null){if(activePasses.has(t.pass))fail('A card has more than one open trip.');activePasses.add(t.pass);}
    return {...t};
  });
  // No overlapping assignments for the same card or student, including malformed saved data.
  const ends=t=>t.cancelledAt??t.returnedAt??(t.departedAt===null?t.expiresAt:Infinity);
  for(let i=0;i<trips.length;i++)for(let j=0;j<i;j++){
    const a=trips[i],b=trips[j];
    if((a.pass===b.pass||a.student.toLocaleLowerCase()===b.student.toLocaleLowerCase())&&a.approvedAt<ends(b)&&b.approvedAt<ends(a))fail('Overlapping card or student assignments in saved records.');
  }
  return {version:2,revision:raw.revision,trips};
}
export function parseState(text) {
  if(text===null)return createState();
  let raw;try{raw=JSON.parse(text);}catch{fail('Saved data could not be read. Nothing was overwritten.');}
  return validateState(raw);
}
export const isExpired=(trip,now=Date.now())=>now>=trip.expiresAt||dayKey(now)!==dayKey(trip.approvedAt);
export function status(trip,now=Date.now()) {
  if(trip.cancelledAt!==null)return 'Cancelled';
  if(trip.returnedAt!==null)return 'Returned';
  if(trip.departedAt!==null)return `${trip.arrivedAt!==null?'Arrived':'On the way'}${isExpired(trip,now)?' · overdue':''}`;
  return isExpired(trip,now)?'Expired':'Approved';
}
export const isOpen=(trip,now)=>trip.cancelledAt===null&&trip.returnedAt===null&&(trip.departedAt!==null||!isExpired(trip,now));
export function currentTrip(state,pass,now=Date.now()) {
  const normalized=normalizePass(pass);
  return [...state.trips].reverse().find(t=>t.pass===normalized&&isOpen(t,now))??null;
}
function commit(state,trips,now) {
  if(!Number.isSafeInteger(state.revision+1))fail('Saved revision limit reached. Export your history before resetting.');
  const keep=new Set(trips.filter(t=>!isOpen(t,now)).slice(-200).map(t=>t.id));
  return validateState({version:2,revision:state.revision+1,trips:trips.filter(t=>isOpen(t,now)||keep.has(t.id))});
}
export function approvePass(state,request,now=Date.now()) {
  const current=validateState(state);time(now);
  if(request?.staffApproved!==true)fail('A staff member must approve this card. Scanning cannot grant permission.');
  const pass=normalizePass(request.pass),student=String(request.student??'').trim();
  if(!cleanText(student))fail('Enter a short student code or initials (1–40 characters).');
  if(!DESTINATIONS.includes(request.destination))fail('Choose CIRC or ECTV.');
  if(currentTrip(current,pass,now))fail(`${pass} already has an approval or open trip. Return it or cancel its unused approval first.`);
  if(current.trips.some(t=>isOpen(t,now)&&t.student.toLocaleLowerCase()===student.toLocaleLowerCase()))fail('That student code already has an approval or open trip.');
  if(request.minutes!=='day'&&(!Number.isInteger(request.minutes)||request.minutes<5||request.minutes>480))fail('Choose a valid approval window.');
  const expiresAt=Math.min(nextMidnight(now),request.minutes==='day'?Infinity:now+request.minutes*60000);
  const trip={id:`trip-${now}-${current.revision+1}`,pass,student,destination:request.destination,approvedAt:now,expiresAt,departedAt:null,arrivedAt:null,returnedAt:null,cancelledAt:null};
  return commit(current,[...current.trips,trip],now);
}
export function scanPass(state,pass,action,now=Date.now()) {
  const current=validateState(state);time(now);const card=normalizePass(pass);
  if(!['depart','arrive','return'].includes(action))fail('Choose Depart, Arrive or Return first.');
  const trip=[...current.trips].reverse().find(t=>t.pass===card);
  if(!trip||trip.cancelledAt!==null)fail(`${card} has no staff approval. Ask the teacher.`);
  const field={depart:'departedAt',arrive:'arrivedAt',return:'returnedAt'}[action];
  if(trip.returnedAt!==null&&action!=='return')fail('This trip is closed. Ask staff for a new approval.');
  if(trip[field]!==null)return {state:current,trip,message:`${card}: ${action==='depart'?'departure':action==='arrive'?'arrival':'return'} already recorded. No duplicate added.`};
  if(trip.returnedAt!==null)fail('This trip is closed. Ask staff for a new approval.');
  if(action==='depart'){if(isExpired(trip,now)||now<trip.approvedAt)fail('This approval has expired or the device clock is wrong. Ask staff for a new approval.');}
  else if(trip.departedAt===null)fail('Departure has not been activated. An approval alone is not a trip.');
  if(now<(trip.arrivedAt??trip.departedAt??trip.approvedAt))fail('The device clock moved backwards. Check its date and time.');
  const updated={...trip,[field]:now},next=commit(current,current.trips.map(t=>t.id===trip.id?updated:t),now);
  const late=isExpired(trip,now)&&action!=='depart'?' Recorded after expiry; staff should check in.':'';
  return {state:next,trip:updated,message:`${card}: ${action==='depart'?'departure activated':action==='arrive'?'arrival recorded':'returned and ready for a new approval'}.${late}`};
}
export function cancelApproval(state,id,staffApproved,now=Date.now()) {
  const current=validateState(state);time(now);
  if(!staffApproved)fail('Staff access required.');
  const trip=current.trips.find(t=>t.id===id);
  if(!trip||trip.departedAt!==null)fail('Only unused approvals may be cancelled. Use Return for an open trip.');
  if(trip.cancelledAt!==null)return current;
  if(now<trip.approvedAt)fail('Check the device clock.');
  return commit(current,current.trips.map(t=>t.id===id?{...t,cancelledAt:now}:t),now);
}
