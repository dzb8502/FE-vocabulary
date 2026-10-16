const EXAM=new Date('2027-02-16T08:00:00');
const KEY='fe_vocab_progress_v1', SETKEY='fe_vocab_settings_v1', PLANKEY='fe_vocab_plan_v1', SESSIONKEY='fe_vocab_sessions_v16';
let vocab=[], queue=[], idx=0, mode='';
let progress=JSON.parse(localStorage.getItem(KEY)||'{}');
let settings=Object.assign({rate:.75,newLimit:25,shuffle:true},JSON.parse(localStorage.getItem(SETKEY)||'{}'));
let plan=JSON.parse(localStorage.getItem(PLANKEY)||'null');
let sessions=JSON.parse(localStorage.getItem(SESSIONKEY)||'{}');
const $=id=>document.getElementById(id), today=()=>localDate();
function days(n){let d=new Date();d.setDate(d.getDate()+n);return localDate(d)}
function p(id){
  const old=progress[id]||{};
  return Object.assign({reviews:0,interval:0,due:'',last:'',strength:0,morningGrade:'',morningDate:'',afternoonRetention:'',afternoonDate:'',history:[],custom:false},old);
}
function save(){localStorage.setItem(SESSIONKEY,JSON.stringify(sessions));localStorage.setItem(KEY,JSON.stringify(progress));localStorage.setItem(SETKEY,JSON.stringify(settings));localStorage.setItem(PLANKEY,JSON.stringify(plan));stats();renderPlan()}
function localDate(d=new Date()){let y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function calendarDiff(a,b){let A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.floor((B-A)/86400000)}
function shuffle(a){for(let i=a.length-1;i>0;i--){const r=new Uint32Array(1);crypto.getRandomValues(r);let k=r[0]%(i+1);[a[i],a[k]]=[a[k],a[i]]}return a}
function getMorningSession(){
  let s=sessions.morning;
  if(s&&s.date===today())return s;
  const due=vocab.filter(v=>{let x=p(v.id);return x.reviews>0&&x.due&&x.due<=today()&&x.morningDate!==today()});
  const fresh=vocab.filter(v=>p(v.id).reviews===0).sort(orderNew).slice(0,settings.newLimit);
  const selected=[...new Map([...due,...fresh].map(v=>[v.id,v])).values()];
  s={date:today(),ids:settings.shuffle?shuffle(selected.map(v=>v.id)):selected.map(v=>v.id),cursor:0,dueCount:due.length,newCount:fresh.length};sessions.morning=s;save();return s;
}
function getAfternoonSession(){
  let s=sessions.afternoon;
  if(s&&s.date===today())return s;
  const selected=vocab.filter(v=>{let x=p(v.id);return x.morningDate===today()&&x.morningGrade&&x.morningGrade!=='easy'&&x.afternoonDate!==today()});
  s={date:today(),ids:settings.shuffle?shuffle(selected.map(v=>v.id)):selected.map(v=>v.id),cursor:0};sessions.afternoon=s;save();return s;
}
function renderPlan(){
  const nice=new Date().toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'});
  if(!plan||!plan.startDate){$('studyDay').textContent='Study plan not started'}
  else $('studyDay').textContent=`Day ${Math.max(1,calendarDiff(plan.startDate,today())+1)} · ${nice}`;
  // Preview does not create a queue or alter the daily shuffle.
  const existing=sessions.morning&&sessions.morning.date===today()?sessions.morning:null;
  const due=existing?existing.dueCount:vocab.filter(v=>{let x=p(v.id);return x.reviews>0&&x.due&&x.due<=today()&&x.morningDate!==today()}).length;
  const fresh=existing?existing.newCount:Math.min(settings.newLimit,vocab.filter(v=>p(v.id).reviews===0).length);
  const total=existing?existing.ids.length:due+fresh;
  const completed=existing?Math.min(existing.cursor,existing.ids.length):0;
  $('morningTotal').textContent=total;
  $('morningBreakdown').textContent=`${due} reviews + ${fresh} new`;
  $('morningCompleted').textContent=`${completed} / ${total} completed`;
  $('morningBar').style.width=total?`${100*completed/total}%`:'0%';
  const afternoon=sessions.afternoon&&sessions.afternoon.date===today()?sessions.afternoon:null;
  const afternoonTotal=afternoon?afternoon.ids.length:vocab.filter(v=>{let x=p(v.id);return x.morningDate===today()&&x.morningGrade&&x.morningGrade!=='easy'&&x.afternoonDate!==today()}).length;
  const afternoonDone=afternoon?Math.min(afternoon.cursor,afternoon.ids.length):0;
  $('afternoonTotal').textContent=afternoonTotal;
  $('afternoonCompleted').textContent=`${afternoonDone} / ${afternoonTotal} completed`;
}
function stats(){
  const vals=Object.values(progress);
  $('learnedCount').textContent=vals.filter(x=>(x.reviews||0)>0).length;
  $('masteredCount').textContent=vals.filter(x=>(x.interval||0)>=14).length;
  $('dueCount').textContent=vocab.filter(v=>{let x=p(v.id);return x.reviews>0&&x.due&&x.due<=today()}).length;
}
function countdown(){let n=Math.max(0,Math.ceil((EXAM-new Date())/86400000));$('countdown').textContent=`${n} days to FE Other Disciplines · Feb 16, 2027`}
function orderNew(a,b){let rank={CORE_NOW:0,SUPPORT_NEXT:1,DEFER_OPTIONAL:2};return rank[a.pool]-rank[b.pool]||a.id-b.id}
function setActive(which){
  ['morningBtn','afternoonBtn','browseBtn'].forEach(id=>$(id).classList.remove('primary'));
  if(which==='morning')$('morningBtn').classList.add('primary');
  if(which==='afternoon')$('afternoonBtn').classList.add('primary');
  if(which==='browse')$('browseBtn').classList.add('primary');
}
function start(which){
  mode=which;setActive(which);
  const s=which==='morning'?getMorningSession():getAfternoonSession();
  queue=s.ids.map(id=>vocab.find(v=>v.id===id)).filter(Boolean);idx=Math.min(s.cursor,queue.length);
  $('browse').classList.add('hidden');$('session').classList.remove('hidden');
  $('sessionTitle').textContent=which==='morning'?'Morning Session':'Afternoon Review';show();
}
function advance(){idx++;if(sessions[mode]&&sessions[mode].date===today()){sessions[mode].cursor=idx;save()}show()}
function ratingHTML(){
  if(mode==='afternoon') return '<button data-retention="forgot" class="forgot">Forgot</button><button data-retention="know" class="know">Know</button>';
  return '<button data-grade="again">Again</button><button data-grade="hard">Hard</button><button data-grade="good">Good</button><button data-grade="easy">Easy</button>';
}
function bindRatings(){
  document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>gradeMorning(b.dataset.grade));
  document.querySelectorAll('[data-retention]').forEach(b=>b.onclick=()=>gradeAfternoon(b.dataset.retention));
}
function show(){
  if(idx>=queue.length){$('sessionTitle').textContent='Session complete';$('sessionProgress').textContent=`${queue.length}/${queue.length}`;$('card').classList.add('hidden');$('ratings').classList.add('hidden');return}
  $('card').classList.remove('hidden');let v=queue[idx];$('sessionProgress').textContent=`${idx+1}/${queue.length}`;
  $('term').textContent=v.term;$('ipa').textContent=v.ipa;$('stress').textContent=v.stress?`Stress: ${v.stress}`:'';$('zh').textContent=v.zh;$('connection').textContent=v.connection;$('domain').textContent=v.domain;$('pool').textContent=v.pool.replace('_NOW','').replace('_NEXT','');$('source').textContent=`${v.source} · Handbook hits: ${v.hbHits}`;
  $('answer').classList.add('hidden');$('ratings').classList.add('hidden');$('ratings').innerHTML=ratingHTML();bindRatings();$('revealBtn').classList.remove('hidden');
}
function speak(){let v=queue[idx];if(!v)return;speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(v.term);u.lang='en-US';u.rate=Number(settings.rate);let voices=speechSynthesis.getVoices();let voice=voices.find(x=>x.lang==='en-US')||voices.find(x=>x.lang.startsWith('en'));if(voice)u.voice=voice;speechSynthesis.speak(u)}
function pushHistory(x,event,value,v){
  x.history=Array.isArray(x.history)?x.history:[];
  x.history.push({at:new Date().toISOString(),date:today(),session:event,value,term:v.term});
}
function gradeMorning(g){
  let v=queue[idx],x=p(v.id);x.reviews++;x.last=today();x.morningGrade=g;x.morningDate=today();x.afternoonRetention='';x.afternoonDate='';pushHistory(x,'morning',g,v);
  if(g==='again'){
    x.interval=0;x.due=today();x.strength=0;
    // Re-show later in the same morning, not immediately.
    if(!queue.slice(idx+1).some(q=>q.id===v.id)){let at=Math.min(idx+4,queue.length);queue.splice(at,0,v);if(sessions.morning&&sessions.morning.date===today())sessions.morning.ids.splice(at,0,v.id)}
  }else if(g==='hard'){
    x.interval=1;x.due=days(1);x.strength=1;
  }else if(g==='good'){
    x.interval=1;x.due=days(1);x.strength=2;
  }else{
    x.interval=Math.max(7,x.interval||0);x.due=days(x.interval);x.strength=3;
  }
  progress[v.id]=x;save();advance();
}
function gradeAfternoon(r){
  let v=queue[idx],x=p(v.id);x.reviews++;x.last=today();x.afternoonRetention=r;x.afternoonDate=today();pushHistory(x,'afternoon',r,v);
  if(r==='forgot'){
    // Forgetting after a few hours overrides optimistic morning ratings.
    x.interval=1;x.due=days(1);x.strength=0;
  }else{
    // Same-day retention confirms learning, but morning difficulty still controls spacing.
    const g=x.morningGrade;
    if(g==='again'||g==='hard'){x.interval=1;x.due=days(1);x.strength=Math.max(1,x.strength||0)}
    else if(g==='good'){x.interval=3;x.due=days(3);x.strength=2}
    else{x.interval=Math.max(7,x.interval||7);x.due=days(x.interval);x.strength=3}
  }
  progress[v.id]=x;save();advance();
}
function browse(){mode='browse';setActive('browse');$('session').classList.add('hidden');$('browse').classList.remove('hidden');renderResults()}
function renderResults(){let q=$('search').value.trim().toLowerCase(),f=$('filter').value;let arr=vocab.filter(v=>(f==='ALL'||v.pool===f)&&(!q||v.term.toLowerCase().includes(q)||v.zh.includes(q))).slice(0,100);$('results').innerHTML=arr.map(v=>`<div class="result"><b>${v.term}</b> <span>${v.ipa}</span><small>${v.zh} · ${v.domain} · ${v.pool}</small></div>`).join('')||'<p>No matches.</p>'}
$('morningBtn').onclick=()=>start('morning');$('afternoonBtn').onclick=()=>start('afternoon');$('browseBtn').onclick=browse;
$('revealBtn').onclick=()=>{$('answer').classList.remove('hidden');$('ratings').classList.remove('hidden');$('revealBtn').classList.add('hidden')};$('speakBtn').onclick=speak;
$('endBtn').onclick=()=>{$('session').classList.add('hidden');$('card').classList.remove('hidden');mode='';setActive('')};$('search').oninput=renderResults;$('filter').onchange=renderResults;
$('settingsBtn').onclick=()=>{$('rate').value=settings.rate;$('newLimit').value=settings.newLimit;$('shuffleToggle').checked=settings.shuffle!==false;$('settings').showModal()};
$('closeSettings').onclick=()=>{settings.rate=Number($('rate').value);settings.newLimit=Number($('newLimit').value);settings.shuffle=$('shuffleToggle').checked;$('speakBtn').textContent=`🔊 ${settings.rate}×`;save();$('settings').close()};
$('exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify({version:1.6,exported:new Date().toISOString(),progress,settings,plan,sessions},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fe-vocab-progress.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{let j=JSON.parse(await e.target.files[0].text());if(j.progress){progress=j.progress;settings=Object.assign(settings,j.settings||{});if(j.plan)plan=j.plan;if(j.sessions)sessions=j.sessions;save();alert('Progress imported.')}};
$('startPlanBtn').onclick=()=>{if(plan&&plan.startDate){if(!confirm(`Study plan already started on ${plan.startDate}. Restart Day 1 today?`))return}plan={startDate:today(),startedAt:new Date().toISOString()};save();alert('Study plan started. Today is Day 1.')};
$('resetBtn').onclick=()=>{if(confirm('Reset ALL study progress and study-plan Day count? Your 1008-word vocabulary will NOT be deleted.')){progress={};plan=null;sessions={};localStorage.removeItem(SESSIONKEY);localStorage.removeItem(KEY);localStorage.removeItem(PLANKEY);save();alert('Progress reset. Seen is back to 0. Start Study Plan when ready.')}};
vocab=Array.isArray(window.FE_VOCAB)?window.FE_VOCAB:[];if(vocab.length!==1008){alert('Vocabulary bundle did not load correctly ('+vocab.length+'/1008).')}
stats();countdown();renderPlan();$('speakBtn').textContent=`🔊 ${settings.rate}×`;$('browseBtn').textContent=`Browse ${vocab.length}`;setActive('');
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
