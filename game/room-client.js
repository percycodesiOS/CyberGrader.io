/* Teacher-controlled rooms. Tokens stay out of URLs and local world backups. */
(function(root){
  'use strict';
  const SESSION_KEY='mynecraft_room_session_v1', MAX_EDITS=20000, MAX_PLAYERS=40;
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
  function serviceURL(value){
    try{const u=new URL(value);if(u.username||u.password||u.search||u.hash)return null;const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);if(u.protocol!=='https:'&&!(local&&u.protocol==='http:'))return null;return u.href.replace(/\/+$/,'');}catch{return null;}
  }
  function validSession(v){return plain(v)&&serviceURL(v.baseUrl)!==null&&typeof v.token==='string'&&v.token.length>=8&&v.token.length<=4096&&id(v.roomId)&&id(v.studentId)&&Number.isInteger(v.number)&&v.number>0&&v.number<=10000;}
  function readSession(){try{const s=JSON.parse(root.sessionStorage.getItem(SESSION_KEY));return validSession(s)?{baseUrl:serviceURL(s.baseUrl),token:s.token,roomId:s.roomId,studentId:s.studentId,number:s.number}:null;}catch{return null;}}
  function saveSession(value){if(!validSession(value))throw new Error('The room service returned an invalid session.');root.sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));}
  function clearSession(){try{root.sessionStorage.removeItem(SESSION_KEY);}catch{}}
  function boundedPoint(p){return plain(p)&&finite(p.x)&&Math.abs(p.x)<=512&&finite(p.y)&&p.y>=-64&&p.y<=100&&finite(p.z)&&Math.abs(p.z)<=512;}
  function editValue(p){return boundedPoint(p)&&[p.x,p.y,p.z].every(Number.isInteger)&&(p.block===null||typeof p.block==='string'&&/^[a-z][a-z0-9_]{0,39}$/.test(p.block));}
  function safeError(code,status){
    const errors={room_closed:'Your teacher has closed this room.',player_locked:'Your teacher has paused your building.',player_removed:'Your teacher has removed this player from the room.',invalid_code:'That room code was not found.',room_not_found:'That room code was not found.',unauthorized:'Access expired or the password was not accepted.',forbidden:'The room service did not allow that action.'};
    return errors[code]||(typeof code==='string'&&code.length<=240&&!/[\r\n<>]/.test(code)?code:null)||(status===401?'Access expired or the password was not accepted.':status===403?'Your teacher has paused access to this room.':status===404?'Room service not found. Check its address and room code.':status===409?'The room is closed or this action is no longer available.':'The room service could not complete that action.');
  }
  async function request(base,path,token,method='GET',body,signal){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    const abort=()=>controller.abort();if(signal){if(signal.aborted)controller.abort();else signal.addEventListener('abort',abort,{once:true});}
    try{
      const response=await fetch(base+path,{method,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
      let data;try{data=await response.json();}catch{throw new Error('This address did not return room service data.');}
      if(!response.ok){const error=new Error(safeError(data.code||data.error,response.status));error.status=response.status;throw error;}return data;
    }catch(error){if(error.name==='AbortError')throw new Error('The room service took too long to reply. Try again.');if(error instanceof TypeError)throw new Error('Could not reach the room service. Check its address and connection.');throw error;}
    finally{clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort);}
  }
  function normalizeState(raw){
    if(!plain(raw)||!['open','closed'].includes(raw.status)||!Number.isSafeInteger(raw.sequence)||raw.sequence<0||!plain(raw.self))throw new Error('The room service returned an invalid world state.');
    const edits=[];
    if(Array.isArray(raw.edits)){if(raw.edits.length>MAX_EDITS)throw new Error('The room is too large to load.');for(const p of raw.edits){if(!editValue(p))throw new Error('The room contained an invalid block change.');edits.push({x:p.x,y:p.y,z:p.z,block:p.block});}}
    else if(plain(raw.edits)){const entries=Object.entries(raw.edits);if(entries.length>MAX_EDITS)throw new Error('The room is too large to load.');for(const [key,block] of entries){if(!/^-?\d+,-?\d+,-?\d+$/.test(key))throw new Error('The room contained an invalid block change.');const [x,y,z]=key.split(',').map(Number),p={x,y,z,block};if(!editValue(p))throw new Error('The room contained an invalid block change.');edits.push(p);}}
    else throw new Error('The room service returned no block data.');
    const list=Array.isArray(raw.players)?raw.players:plain(raw.players)?Object.values(raw.players):null;
    if(!list||list.length>MAX_PLAYERS)throw new Error('The room service returned invalid players.');
    const players=list.filter(p=>plain(p)&&id(p.id||p.studentId)&&Number.isInteger(p.number)&&p.number>0&&p.number<=10000&&boundedPoint(p.position||p)).map(p=>{const pos=p.position||p;return {id:p.id||p.studentId,number:p.number,x:pos.x,y:pos.y,z:pos.z,yaw:finite(pos.yaw)?pos.yaw:0,locked:p.locked===true,removed:p.removed===true};});
    if(raw.world!=='resource-v1'||raw.mode!=='creative')throw new Error('This room uses a different world version. Return to Class Rooms.');
    const self=raw.self;if(!id(self.id||self.studentId)||!Number.isInteger(self.number)||!boundedPoint(self)||!finite(self.yaw))throw new Error('The room service returned an invalid player state.');
    return {world:raw.world,mode:raw.mode,bounds:raw.bounds,status:raw.status,sequence:raw.sequence,edits,players,self:{id:self.id||self.studentId,number:self.number,x:self.x,y:self.y,z:self.z,yaw:self.yaw,locked:self.locked===true,removed:self.removed===true}};
  }
  function create(api){
    const session=api.session||readSession();if(!validSession(session))throw new Error('Join a class room before opening its world.');
    const base=serviceURL(session.baseUrl),path='/api/rooms/'+encodeURIComponent(session.roomId);
    let state=null,hydrated=false,disposed=false,polling=false,editing=false,moving=false,blocked=false,lastMove=0,lastSequence=-1;
    const knownEdits=new Map(),controller=new AbortController();
    const status=text=>{if(!disposed&&api.onStatus)api.onStatus(text);};
    const canPlay=()=>!disposed&&hydrated&&!blocked&&state.status==='open'&&!state.self.locked&&!state.self.removed;
    const canWrite=()=>canPlay()&&(!api.isActive||api.isActive());
    async function poll(){
      if(disposed||polling)return false;polling=true;
      try{
        const next=normalizeState(await request(base,path+'/state',session.token,'GET',undefined,controller.signal));if(disposed)return false;
        if(next.sequence<lastSequence)return false;
        const previous=state;state=next;blocked=false;
        for(const p of next.edits){const key=p.x+','+p.y+','+p.z;if(!knownEdits.has(key)||knownEdits.get(key)!==p.block){if(api.onEdit)api.onEdit(p);knownEdits.set(key,p.block);}}
        lastSequence=next.sequence;hydrated=true;
        if(api.onPlayers)api.onPlayers(next.players,session.studentId);
        if(api.onState)api.onState({...next,hydrated:true});
        if(next.status==='closed'||next.self.locked||next.self.removed){if(api.onClosed&&(!previous||previous.status!==next.status||previous.self.locked!==next.self.locked||previous.self.removed!==next.self.removed))api.onClosed(next);status(next.self.removed?'Your teacher removed this player. Return to Class Rooms.':next.status==='closed'?'Your teacher closed this room. Wait for your teacher to reopen it.':'Waiting for your teacher to admit or resume you.');}
        else if(!previous||previous.status!=='open'||previous.self.locked||previous.self.removed)status('Connected as Player '+session.number+'. Build with your group.');
        return true;
      }catch(error){if(!disposed){blocked=true;status(error.message);if(api.onClosed)api.onClosed({status:'unavailable',message:error.message});}return false;}finally{polling=false;}
    }
    async function edit(p){
      if(!canWrite()||editing||!editValue(p)){status(editing?'Wait for your last block to save.':'Building is paused until your room is open and connected.');return false;}
      editing=true;
      try{const result=await request(base,path+'/edit',session.token,'POST',p,controller.signal);if(disposed)return false;if(result.locked===true){blocked=true;if(api.onClosed)api.onClosed({status:'open',self:{locked:true},message:'Your teacher is reviewing this build.'});}await poll();return true;}
      catch(error){if(!disposed){blocked=true;status(error.message);void poll();}return false;}finally{editing=false;}
    }
    async function move(p){
      const now=Date.now();if(!canWrite()||moving||now-lastMove<200||!boundedPoint(p)||!finite(p.yaw))return false;lastMove=now;moving=true;
      const yaw=((p.yaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
      try{await request(base,path+'/move',session.token,'POST',{x:p.x,y:p.y,z:p.z,yaw},controller.signal);return !disposed;}catch(error){if(!disposed){blocked=true;status(error.message);void poll();}return false;}finally{moving=false;}
    }
    const timer=setInterval(()=>{void poll();},750);void poll();
    return {poll,edit,move,canPlay,canWrite,getState:()=>state,dispose(){disposed=true;clearInterval(timer);controller.abort();knownEdits.clear();}};
  }
  root.MYNE_ROOM=Object.freeze({SESSION_KEY,serviceURL,validSession,readSession,saveSession,clearSession,normalizeState,create});

  if(!root.document||!document.body?.hasAttribute?.('data-myneroom-launcher'))return;
  const $=id=>document.getElementById(id),service=$('roomService');
  service.value=readSession()?.baseUrl||serviceURL(location.origin)||'';
  let teacherToken='',teacherBase='',refreshTimer=null,refreshing=false;
  const manualAcknowledgments=new Map(),openLogs=new Set(),renderedRooms=new Map();
  let emptyRoomMessage=null;
  const show=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.dataset.error=String(error);};
  const baseFromInput=()=>{const base=serviceURL(service.value.trim());if(!base)throw new Error('Use an HTTPS room service address. HTTP is allowed only on localhost.');return base;};
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(className)el.className=className;return el;};
  function actionButton(label,action,className='secondary'){const button=node('button',label,className);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{await action();}catch(error){show('teacherStatus',error.message,true);}finally{button.disabled=false;}});return button;}
  $('studentJoin').addEventListener('submit',async event=>{
    event.preventDefault();$('joinButton').disabled=true;show('studentStatus','Joining your room…');
    try{const base=baseFromInput(),code=$('roomCode').value.trim();if(!/^\d{8}$/.test(code))throw new Error('Enter the eight-digit room code your teacher gave you.');const result=await request(base,'/api/join',null,'POST',{code});saveSession({baseUrl:base,token:result.token,roomId:result.roomId,studentId:result.studentId,number:result.number});location.assign('mynecraft.html?room=1');}catch(error){show('studentStatus',error.message,true);}finally{$('joinButton').disabled=false;}
  });
  $('teacherLogin').addEventListener('submit',async event=>{
    event.preventDefault();$('loginButton').disabled=true;show('teacherStatus','Opening teacher controls…');
    try{const base=baseFromInput(),password=$('teacherPassword').value;const result=await request(base,'/api/teacher/login',null,'POST',{password});if(typeof result.token!=='string'||result.token.length<8||result.token.length>4096)throw new Error('The service did not return valid teacher access.');teacherToken=result.token;teacherBase=base;$('teacherPassword').value='';$('teacherDashboard').hidden=false;service.disabled=true;show('teacherStatus','Teacher controls are open.');await refreshRooms();clearInterval(refreshTimer);refreshTimer=setInterval(()=>{void refreshRooms();},5000);}catch(error){show('teacherStatus',error.message,true);}finally{$('loginButton').disabled=false;}
  });
  function logout(){teacherToken='';teacherBase='';clearInterval(refreshTimer);refreshTimer=null;manualAcknowledgments.clear();openLogs.clear();renderedRooms.clear();emptyRoomMessage=null;$('teacherDashboard').hidden=true;$('roomsList').textContent='';service.disabled=false;$('teacherPassword').value='';show('teacherStatus','Signed out of teacher controls.');}
  $('teacherLogout').addEventListener('click',logout);
  $('createRoom').addEventListener('click',async()=>{const button=$('createRoom');button.disabled=true;try{await request(teacherBase,'/api/rooms',teacherToken,'POST',{});await refreshRooms();show('teacherStatus','A closed room was created. Open it when your group is ready.');}catch(error){show('teacherStatus',error.message,true);}finally{button.disabled=false;}});
  $('refreshRooms').addEventListener('click',()=>{void refreshRooms(true);});
  async function refreshRooms(force=false){
    if(!teacherToken||refreshing)return;refreshing=true;
    const token=teacherToken,base=teacherBase;
    try{
      const result=await request(base,'/api/rooms',token),rooms=Array.isArray(result)?result:result.rooms;
      if(!Array.isArray(rooms)||rooms.length>200)throw new Error('The service returned an invalid room list.');
      const rows=await Promise.all(rooms.filter(r=>plain(r)&&id(r.id||r.roomId)).map(async room=>({room,state:await request(base,'/api/rooms/'+encodeURIComponent(room.id||room.roomId)+'/state',token)})));
      if(teacherToken!==token||teacherBase!==base)return;
      const list=$('roomsList'),liveIds=new Set(rows.map(({room})=>room.id||room.roomId));
      for(const [id,cached] of renderedRooms)if(!liveIds.has(id)){cached.card.remove();renderedRooms.delete(id);}
      if(rows.length===0){if(!emptyRoomMessage){emptyRoomMessage=node('p','No rooms yet. Create one to begin.','help');list.appendChild(emptyRoomMessage);}}
      else if(emptyRoomMessage){emptyRoomMessage.remove();emptyRoomMessage=null;}
      for(const {room,state} of rows){
        const roomId=room.id||room.roomId,players=Array.isArray(state.players)?state.players:plain(state.players)?Object.values(state.players):[];
        // Movement and polling sequences do not change teacher controls. Keep
        // those live DOM nodes in place while a teacher clicks or uses a key.
        const fingerprint=JSON.stringify({code:state.code||room.code,status:state.status,automatic:state.automaticTextDetection===true,
          players:players.map(p=>[p.id||p.studentId,p.number,p.locked,p.removed]),
          events:(Array.isArray(state.events)?state.events:[]).slice(-100).map(e=>[e.sequence,e.type,e.studentId,e.at,e.evidence?.reason,e.evidence?.blocks?.length])});
        const previous=renderedRooms.get(roomId);if(previous?.fingerprint===fingerprint)continue;
        const focused=previous?.card.contains(document.activeElement)?document.activeElement.dataset.focusKey:null;
        const card=renderRoom(room,state);
        if(previous)list.replaceChild(card,previous.card);else list.appendChild(card);
        renderedRooms.set(roomId,{card,fingerprint});
        if(focused)for(const control of card.querySelectorAll('[data-focus-key]'))if(control.dataset.focusKey===focused){control.focus({preventScroll:true});break;}
      }
    }catch(error){show('teacherStatus',error.message,true);}finally{refreshing=false;}
  }
  function renderRoom(room,state){
    const roomId=room.id||room.roomId,path='/api/rooms/'+encodeURIComponent(roomId),card=node('article',undefined,'room'),heading=node('div',undefined,'room-heading');
    const code=state.code||room.code||'',title=node('div');title.append(node('h3','Class room'),node('div',code, 'code'));heading.append(title,node('span',state.status==='open'?'OPEN':'CLOSED','badge'+(state.status==='open'?' open':'')));card.append(heading);
    const controls=node('div',undefined,'buttons');
    const mutate=async(endpoint,body={})=>{await request(teacherBase,path+endpoint,teacherToken,'POST',body);await refreshRooms(true);};
    if(state.status==='open'){const close=actionButton('Close room',()=>mutate('/close'),'danger');close.dataset.focusKey='close';controls.append(close);}
    else{
      const needsReview=state.automaticTextDetection!==true;
      const open=actionButton('Open / reopen room',()=>mutate('/open',needsReview?{manualReview:true}:{}));open.dataset.focusKey='open';
      if(needsReview){const label=node('label',undefined,'review-choice'),checkbox=node('input');checkbox.type='checkbox';checkbox.dataset.focusKey='manual-review';checkbox.checked=manualAcknowledgments.get(roomId)===true;open.disabled=!checkbox.checked;
        checkbox.addEventListener('change',()=>{manualAcknowledgments.set(roomId,checkbox.checked);open.disabled=!checkbox.checked;});label.append(checkbox,document.createTextNode(' Automatic text detection is not configured. I will supervise and review this room myself.'));card.append(label);}
      controls.append(open);
    }
    if(state.status==='open'&&state.automaticTextDetection!==true)card.append(node('p','Automatic text detection is not configured. Teacher review is required.','notice'));
    card.append(controls);
    const players=Array.isArray(state.players)?state.players:plain(state.players)?Object.values(state.players):[];
    if(players.length){const wrap=node('div',undefined,'table-wrap'),table=node('table'),head=node('tr');for(const text of ['Player','Access','Teacher actions'])head.append(node('th',text));table.append(head);
      for(const player of players.slice(0,MAX_PLAYERS)){const playerId=player.id||player.studentId;if(!id(playerId))continue;const tr=node('tr'),buttons=node('div',undefined,'buttons'),actions=node('td');tr.append(node('td','Player '+(Number.isInteger(player.number)?player.number:'?')),node('td',player.removed?'Removed':player.locked?'Waiting / paused':'Active'));
        const playerAction=type=>mutate('/players/'+encodeURIComponent(playerId)+'/'+type);
        if(player.removed){const restore=actionButton('Restore player',()=>playerAction('restore'));restore.dataset.focusKey=playerId+'-restore';buttons.append(restore);}
        else{const pause=actionButton(player.locked?'Admit / resume':'Pause building',()=>playerAction(player.locked?'unlock':'lock'));pause.dataset.focusKey=playerId+'-pause';const remove=actionButton('Remove from room',()=>playerAction('remove'),'danger');remove.dataset.focusKey=playerId+'-remove';buttons.append(pause,remove);}
        actions.append(buttons);tr.append(actions);table.append(tr);
      }wrap.append(table);card.append(wrap);
    }else card.append(node('p','No students have joined this room.','help'));
    const details=node('details'),summary=node('summary','Private activity log'),log=node('pre');details.append(summary);details.open=openLogs.has(roomId);details.addEventListener('toggle',()=>{if(details.open)openLogs.add(roomId);else openLogs.delete(roomId);});
    const events=Array.isArray(state.events)?state.events.slice(-100):[];
    log.textContent=events.length?events.map(event=>JSON.stringify({sequence:event.sequence,type:event.type,at:event.at,studentId:event.studentId,...(event.evidence?{savedBlockEvidence:true,reason:event.evidence.reason,center:event.evidence.center,blocks:event.evidence.blocks?.length,truncated:event.evidence.truncated}:{} )})).join('\n'):'No service activity records are available.';details.append(log);
    for(const event of events.filter(e=>e.evidence).slice(-10)){const evidence=node('details'),label=node('summary','Saved block evidence · event '+event.sequence+' (not a screenshot)'),pre=node('pre');evidence.append(label);evidence.addEventListener('toggle',()=>{if(evidence.open&&!pre.textContent){pre.textContent=JSON.stringify(event.evidence,null,2).slice(0,300000);evidence.append(pre);}});details.append(evidence);}
    card.append(details);return card;
  }
  root.addEventListener('pagehide',()=>{teacherToken='';clearInterval(refreshTimer);});
})(globalThis);
