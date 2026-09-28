const EXAM=new Date('2027-02-16T08:00:00');
const KEY='fe_vocab_progress_v1', SETKEY='fe_vocab_settings_v1', PLANKEY='fe_vocab_plan_v1';
let vocab=[], queue=[], idx=0, mode='';
let progress=JSON.parse(localStorage.getItem(KEY)||'{}');
let settings=Object.assign({rate:.75,newLimit:25},JSON.parse(localStorage.getItem(SETKEY)||'{}'));
let plan=JSON.parse(localStorage.getItem(PLANKEY)||'null');
const $=id=>document.getElementById(id), today=()=>localDate();
function days(n){let d=new Date();d.setDate(d.getDate()+n);return localDate(d)}
function p(id){
  const old=progress[id]||{};
  return Object.assign({reviews:0,interval:0,due:'',last:'',strength:0,morningGrade:'',morningDate:'',afternoonRetention:'',afternoonDate:'',history:[],custom:false},old);
}
function save(){localStorage.setItem(KEY,JSON.stringify(progress));localStorage.setItem(SETKEY,JSON.stringify(settings));localStorage.setItem(PLANKEY,JSON.stringify(plan));stats();renderPlan()}
function localDate(d=new Date()){let y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function calendarDiff(a,b){let A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.floor((B-A)/86400000)}
function renderPlan(){
  if(!plan||!plan.startDate){$('studyDay').textContent='Study plan not started';$('todayProgress').textContent='Start the study plan when you are ready.';return}
  const day=Math.max(1,calendarDiff(plan.startDate,localDate())+1);
  const nice=new Date().toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'});
  $('studyDay').textContent=`Day ${day} · ${nice}`;
  const t=today(), vals=Object.values(progress);
  const mh=vals.filter(x=>x.morningDate===t&&x.morningGrade).length;
  const ah=vals.filter(x=>x.afternoonDate===t&&x.afternoonRetention).length;
  const due=vocab.filter(v=>{let x=p(v.id);return x.reviews>0&&x.due&&x.due<=t}).length;
  $('todayProgress').textContent=`Morning ${mh}/${settings.newLimit} · Afternoon ${ah} reviewed · ${due} due now`;
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
  mode=which; setActive(which);
  const due=vocab.filter(v=>{let x=p(v.id);return x.reviews>0&&x.due&&x.due<=today()});
  if(which==='morning'){
    const fresh=vocab.filter(v=>p(v.id).reviews===0).sort(orderNew).slice(0,settings.newLimit);
    queue=[...new Map([...due,...fresh].map(v=>[v.id,v])).values()];
  }else{
    // Afternoon is same-day retention. Easy words are intentionally skipped.
    queue=vocab.filter(v=>{let x=p(v.id);return x.morningDate===today()&&x.morningGrade&&x.morningGrade!=='easy'});
  }
  idx=0;$('browse').classList.add('hidden');$('session').classList.remove('hidden');
  $('sessionTitle').textContent=which==='morning'?'Morning Session':'Afternoon Review';show();
}
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
    if(!queue.slice(idx+1).some(q=>q.id===v.id)) queue.splice(Math.min(idx+4,queue.length),0,v);
  }else if(g==='hard'){
    x.interval=1;x.due=days(1);x.strength=1;
  }else if(g==='good'){
    x.interval=1;x.due=days(1);x.strength=2;
  }else{
    x.interval=Math.max(7,x.interval||0);x.due=days(x.interval);x.strength=3;
  }
  progress[v.id]=x;save();idx++;show();
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
  progress[v.id]=x;save();idx++;show();
}
function browse(){mode='browse';setActive('browse');$('session').classList.add('hidden');$('browse').classList.remove('hidden');renderResults()}
function renderResults(){let q=$('search').value.trim().toLowerCase(),f=$('filter').value;let arr=vocab.filter(v=>(f==='ALL'||v.pool===f)&&(!q||v.term.toLowerCase().includes(q)||v.zh.includes(q))).slice(0,100);$('results').innerHTML=arr.map(v=>`<div class="result"><b>${v.term}</b> <span>${v.ipa}</span><small>${v.zh} · ${v.domain} · ${v.pool}</small></div>`).join('')||'<p>No matches.</p>'}
$('morningBtn').onclick=()=>start('morning');$('afternoonBtn').onclick=()=>start('afternoon');$('browseBtn').onclick=browse;
$('revealBtn').onclick=()=>{$('answer').classList.remove('hidden');$('ratings').classList.remove('hidden');$('revealBtn').classList.add('hidden')};$('speakBtn').onclick=speak;
$('endBtn').onclick=()=>{$('session').classList.add('hidden');$('card').classList.remove('hidden');mode='';setActive('')};$('search').oninput=renderResults;$('filter').onchange=renderResults;
$('settingsBtn').onclick=()=>{$('rate').value=settings.rate;$('newLimit').value=settings.newLimit;$('settings').showModal()};
$('closeSettings').onclick=()=>{settings.rate=Number($('rate').value);settings.newLimit=Number($('newLimit').value);$('speakBtn').textContent=`🔊 ${settings.rate}×`;save();$('settings').close()};
$('exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify({version:1.5,exported:new Date().toISOString(),progress,settings},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fe-vocab-progress.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{let j=JSON.parse(await e.target.files[0].text());if(j.progress){progress=j.progress;settings=Object.assign(settings,j.settings||{});save();alert('Progress imported.')}};
$('startPlanBtn').onclick=()=>{if(plan&&plan.startDate){if(!confirm(`Study plan already started on ${plan.startDate}. Restart Day 1 today?`))return}plan={startDate:today(),startedAt:new Date().toISOString()};save();alert('Study plan started. Today is Day 1.')};
$('resetBtn').onclick=()=>{if(confirm('Reset ALL study progress and study-plan Day count? Your 1008-word vocabulary will NOT be deleted.')){progress={};plan=null;localStorage.removeItem(KEY);localStorage.removeItem(PLANKEY);save();alert('Progress reset. Seen is back to 0. Start Study Plan when ready.')}};
vocab=Array.isArray(window.FE_VOCAB)?window.FE_VOCAB:[];if(vocab.length!==1008){alert('Vocabulary bundle did not load correctly ('+vocab.length+'/1008).')}
stats();countdown();renderPlan();$('speakBtn').textContent=`🔊 ${settings.rate}×`;$('browseBtn').textContent=`Browse ${vocab.length}`;setActive('');
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
