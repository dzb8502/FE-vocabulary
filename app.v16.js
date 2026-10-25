const EXAM=new Date('2027-02-16T08:00:00');
const KEY='fe_vocab_progress_v1', SETKEY='fe_vocab_settings_v1', PLANKEY='fe_vocab_plan_v1', SESSIONKEY='fe_vocab_sessions_v16';
let vocab=[], queue=[], idx=0, mode='';
let progress=JSON.parse(localStorage.getItem(KEY)||'{}');
let settings=Object.assign({rate:.75,newLimit:10,dailyLimit:40,shuffle:true},JSON.parse(localStorage.getItem(SETKEY)||'{}'));
if(settings.schedulerVersion!==17){settings.newLimit=Math.min(10,Math.max(0,Number(settings.newLimit)||0));settings.schedulerVersion=17;}
settings.dailyLimit=40;
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
const INTERVALS=[1,3,7,14,30,60];
function dailyCap(){return 40}
// Finish the first pass by February 1, leaving two weeks before the exam.
const FIRST_PASS='2027-02-01';
function isNewToday(id){
  const x=p(id),s=sessions.morning;
  if(s&&s.date===today()&&Array.isArray(s.newIds)&&s.newIds.includes(id))return true;
  if(x.firstSeen)return x.firstSeen===today();
  const h=Array.isArray(x.history)?x.history:[];
  return h.length>0&&h[0].date===today()&&x.morningDate===today();
}
function newTarget(){
  const remaining=vocab.filter(v=>p(v.id).reviews===0).length;
  const learnedToday=vocab.filter(v=>p(v.id).morningDate===today()&&isNewToday(v.id)).length;
  const daysLeft=Math.max(1,calendarDiff(today(),FIRST_PASS)+1);
  return Math.min(35,Math.max(5,Math.ceil((remaining+learnedToday)/daysLeft)));
}
function reviewPriority(v){
  const x=p(v.id),late=Math.max(0,calendarDiff(x.due,today()));
  // Relative lateness captures short-interval risk; aging prevents indefinite deferral.
  const weakness=x.afternoonRetention==='forgot'?3:(x.morningGrade==='hard'||x.morningGrade==='again'?2:0);
  return late/Math.max(1,Number(x.interval)||1)+late/7+weakness;
}
function morningSelection(){
  const due=vocab.filter(v=>{const x=p(v.id);return x.reviews>0&&x.due&&x.due<=today()&&x.morningDate!==today()})
    .sort((a,b)=>reviewPriority(b)-reviewPriority(a)||p(a.id).due.localeCompare(p(b.id).due)||orderNew(a,b));
  const completed=vocab.filter(v=>p(v.id).morningDate===today());
  const available=Math.max(0,dailyCap()-completed.length);
  const doneNew=completed.filter(v=>isNewToday(v.id)).length;
  const fresh=vocab.filter(v=>p(v.id).reviews===0).sort(orderNew).slice(0,Math.min(available,Math.max(0,newTarget()-doneNew)));
  const reviews=due.slice(0,available-fresh.length);
  return {completed,reviews,fresh,deferred:due.length-reviews.length};
}
function normalizeMorning(){
  const s=sessions.morning;
  if(!s||s.date!==today())return;
  const done=[...new Set([...s.ids.slice(0,s.cursor),...vocab.filter(v=>p(v.id).morningDate===today()).map(v=>v.id)])];
  if(s.scheduler!==18){
    const selected=morningSelection();
    const slots=Math.max(0,40-done.length);
    const fresh=selected.fresh.filter(v=>!done.includes(v.id)).slice(0,slots);
    let pending=[...fresh,...selected.reviews.filter(v=>!done.includes(v.id)).slice(0,slots-fresh.length)].map(v=>v.id);
    if(settings.shuffle)shuffle(pending);
    s.newIds=[...done.filter(isNewToday),...selected.fresh.map(v=>v.id)];
    s.ids=[...done,...pending.slice(0,Math.max(0,40-done.length))];s.cursor=done.length;
  }
  const pending=[...new Set(s.ids.slice(s.cursor))].filter(id=>!done.includes(id)&&vocab.some(v=>v.id===id));
  s.ids=[...done,...pending.slice(0,Math.max(0,dailyCap()-done.length))];s.cursor=done.length;
  s.dueCount=s.ids.filter(id=>s.newIds?!s.newIds.includes(id):p(id).reviews>0).length;
  s.newCount=s.ids.length-s.dueCount;
  s.scheduler=18;
}
function getMorningSession(){
  if(sessions.morning&&sessions.morning.date===today()){normalizeMorning();save();return sessions.morning}
  const {completed,reviews,fresh}=morningSelection();
  let ids=[...reviews,...fresh].map(v=>v.id);
  if(settings.shuffle)shuffle(ids);
  const s={date:today(),ids:[...completed.map(v=>v.id),...ids],cursor:completed.length,dueCount:completed.length+reviews.length,newCount:fresh.length,newIds:fresh.map(v=>v.id),scheduler:18};
  sessions.morning=s;save();return s;
}
function getAfternoonSession(){
  let s=sessions.afternoon;
  if(!s||s.date!==today())s={date:today(),ids:[],cursor:0};
  const done=[...new Set(s.ids.slice(0,s.cursor))];
  const selected=vocab.filter(v=>{let x=p(v.id);return x.morningDate===today()&&x.morningGrade&&x.morningGrade!=='easy'&&x.afternoonDate!==today()});
  const pending=selected.map(v=>v.id).filter(id=>!done.includes(id));
  s.ids=[...done,...(settings.shuffle?shuffle(pending):pending)];s.cursor=done.length;
  sessions.afternoon=s;save();return s;
}
function renderPlan(){
  const nice=new Date().toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'});
  if(!plan||!plan.startDate){$('studyDay').textContent='Study plan not started'}
  else $('studyDay').textContent=`Day ${Math.max(1,calendarDiff(plan.startDate,today())+1)} · ${nice}`;
  // Preview does not create a queue or alter the daily shuffle.
  const existing=sessions.morning&&sessions.morning.date===today()?sessions.morning:null;
  const selection=morningSelection();
  const due=existing?existing.dueCount:selection.completed.length+selection.reviews.length;
  const fresh=existing?existing.newCount:selection.fresh.length;
  const total=existing?existing.ids.length:due+fresh;
  const completed=existing?Math.min(existing.cursor,existing.ids.length):0;
  $('morningTotal').textContent=total;
  $('morningBreakdown').textContent=`${due} reviews + ${fresh} new · daily limit ${dailyCap()}`;
  const assigned=new Set(existing?existing.ids:selection.reviews.map(v=>v.id));
  const deferred=vocab.filter(v=>{const x=p(v.id);return x.reviews>0&&x.due&&x.due<=today()&&x.morningDate!==today()&&!assigned.has(v.id)}).length;
  $('deferredCount').textContent=deferred?`${deferred} due words waiting · carried forward, no extra work today`:'No overdue reviews waiting.';
  $('newTargetInfo').textContent=`新词目标 ${newTarget()}/天（至少5个，剩余不足则全部） · 未学 ${vocab.filter(v=>p(v.id).reviews===0).length} · 首轮目标 2月1日`;
  $('morningCompleted').textContent=`${completed} / ${total} completed`;
  $('morningBar').style.width=total?`${100*completed/total}%`:'0%';
  const afternoon=sessions.afternoon&&sessions.afternoon.date===today()?sessions.afternoon:null;
  const afternoonDone=afternoon?Math.min(afternoon.cursor,afternoon.ids.length):0;
  const afternoonTotal=afternoonDone+vocab.filter(v=>{let x=p(v.id);return x.morningDate===today()&&x.morningGrade&&x.morningGrade!=='easy'&&x.afternoonDate!==today()}).length;
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
  return '<button data-grade="hard">Hard</button><button data-grade="good">Good</button><button data-grade="easy">Easy</button>';
}
function bindRatings(){
  document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>gradeMorning(b.dataset.grade));
  document.querySelectorAll('[data-retention]').forEach(b=>b.onclick=()=>gradeAfternoon(b.dataset.retention));
}
function show(){
  if(window.FE_SPEECH)window.FE_SPEECH.stop();
  if(idx>=queue.length){$('sessionTitle').textContent='Session complete';$('sessionProgress').textContent=`${queue.length}/${queue.length}`;$('card').classList.add('hidden');$('ratings').classList.add('hidden');return}
  $('card').classList.remove('hidden');let v=queue[idx];$('sessionProgress').textContent=`${idx+1}/${queue.length}`;
  $('term').textContent=v.term;$('ipa').textContent=v.ipa;$('stress').textContent=v.stress?`Stress: ${v.stress}`:'';$('zh').textContent=v.zh;$('connection').textContent=v.connection;$('domain').textContent=v.domain;$('pool').textContent=v.pool.replace('_NOW','').replace('_NEXT','');$('source').textContent=`${v.source} · Handbook hits: ${v.hbHits}`;
  $('answer').classList.add('hidden');$('ratings').classList.add('hidden');$('ratings').innerHTML=ratingHTML();bindRatings();$('revealBtn').classList.remove('hidden');
}
function speak(){const v=queue[idx];if(v&&window.FE_SPEECH)window.FE_SPEECH.speak(v.term,settings.rate)}
function pushHistory(x,event,value,v){
  x.history=Array.isArray(x.history)?x.history:[];
  x.history.push({at:new Date().toISOString(),date:today(),session:event,value,term:v.term});
}
function gradeMorning(g){
  let v=queue[idx],x=p(v.id);if(!x.reviews)x.firstSeen=today();x.reviews++;x.last=today();x.morningGrade=g;x.morningDate=today();x.afternoonRetention='';x.afternoonDate='';pushHistory(x,'morning',g,v);
  const previous=Number(x.interval)||0;
  if(g==='again'||g==='hard'){
    x.interval=1;x.strength=g==='again'?0:1;
  }else{
    // Advance only on a new day's recall, never twice for same-day confirmation.
    let step=INTERVALS.findIndex(n=>n>previous);
    if(step<0)step=INTERVALS.length-1;
    if(g==='easy')step=Math.min(step+1,INTERVALS.length-1);
    x.interval=INTERVALS[step];
    x.strength=g==='easy'?3:2;
  }
  x.due=days(x.interval);
  progress[v.id]=x;save();advance();
}
function gradeAfternoon(r){
  let v=queue[idx],x=p(v.id);x.reviews++;x.last=today();x.afternoonRetention=r;x.afternoonDate=today();pushHistory(x,'afternoon',r,v);
  if(r==='forgot'){
    // Forgetting after a few hours overrides optimistic morning ratings.
    x.interval=1;x.due=days(1);x.strength=0;
  } // Knowing it in the afternoon confirms today's interval without advancing again.
  progress[v.id]=x;save();advance();
}
function browse(){mode='browse';setActive('browse');$('session').classList.add('hidden');$('browse').classList.remove('hidden');renderResults()}
function renderResults(){let q=$('search').value.trim().toLowerCase(),f=$('filter').value;let arr=vocab.filter(v=>(f==='ALL'||v.pool===f)&&(!q||v.term.toLowerCase().includes(q)||v.zh.includes(q))).slice(0,100);$('results').innerHTML=arr.map(v=>`<div class="result"><b>${v.term}</b> <span>${v.ipa}</span><small>${v.zh} · ${v.domain} · ${v.pool}</small></div>`).join('')||'<p>No matches.</p>'}
$('morningBtn').onclick=()=>start('morning');$('afternoonBtn').onclick=()=>start('afternoon');$('browseBtn').onclick=browse;
$('revealBtn').onclick=()=>{$('answer').classList.remove('hidden');$('ratings').classList.remove('hidden');$('revealBtn').classList.add('hidden')};$('speakBtn').onclick=speak;$('alternateSpeakBtn').onclick=()=>{const v=queue[idx];if(v&&window.FE_SPEECH)window.FE_SPEECH.speak(v.term,settings.rate,true)};
$('endBtn').onclick=()=>{if(window.FE_SPEECH)window.FE_SPEECH.stop();$('session').classList.add('hidden');$('card').classList.remove('hidden');mode='';setActive('')};$('search').oninput=renderResults;$('filter').onchange=renderResults;
$('settingsBtn').onclick=()=>{$('rate').value=settings.rate;$('shuffleToggle').checked=settings.shuffle!==false;$('settings').showModal()};
$('closeSettings').onclick=()=>{settings.rate=Number($('rate').value);settings.dailyLimit=40;normalizeMorning();if(mode==='morning'){queue=sessions.morning.ids.map(id=>vocab.find(v=>v.id===id)).filter(Boolean);idx=sessions.morning.cursor;show();}settings.shuffle=$('shuffleToggle').checked;$('speakBtn').textContent=`🔊 ${settings.rate}×`;save();$('settings').close()};
$('exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify({version:1.8,exported:new Date().toISOString(),progress,settings,plan,sessions},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fe-vocab-progress.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{let j=JSON.parse(await e.target.files[0].text());if(j.progress){progress=j.progress;settings=Object.assign(settings,j.settings||{});if(j.plan)plan=j.plan;if(j.sessions)sessions=j.sessions;normalizeMorning();mode='';$('session').classList.add('hidden');save();alert('Progress imported.')}};
$('startPlanBtn').onclick=()=>{if(plan&&plan.startDate){if(!confirm(`Study plan already started on ${plan.startDate}. Restart Day 1 today?`))return}plan={startDate:today(),startedAt:new Date().toISOString()};save();alert('Study plan started. Today is Day 1.')};
$('resetBtn').onclick=()=>{if(confirm('Reset ALL study progress and study-plan Day count? Your 1008-word vocabulary will NOT be deleted.')){progress={};plan=null;sessions={};localStorage.removeItem(SESSIONKEY);localStorage.removeItem(KEY);localStorage.removeItem(PLANKEY);save();alert('Progress reset. Seen is back to 0. Start Study Plan when ready.')}};
vocab=Array.isArray(window.FE_VOCAB)?window.FE_VOCAB:[];if(vocab.length!==1008){alert('Vocabulary bundle did not load correctly ('+vocab.length+'/1008).')}
normalizeMorning();localStorage.setItem(SESSIONKEY,JSON.stringify(sessions));stats();countdown();renderPlan();$('speakBtn').textContent=`🔊 ${settings.rate}×`;$('browseBtn').textContent=`Browse ${vocab.length}`;setActive('');
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
