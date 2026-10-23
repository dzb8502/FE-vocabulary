const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els=new Map();const storage={};
const node=()=>({textContent:'',value:'',checked:true,style:{},classList:{add(){},remove(){}},showModal(){},close(){}});
const context=vm.createContext({console,Date,Math,JSON,Map,Set,Array,Number,String,Uint32Array,crypto:require('node:crypto').webcrypto,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},document:{getElementById:id=>{if(!els.has(id))els.set(id,node());return els.get(id)},querySelectorAll:()=>[]},window:{FE_VOCAB:Array.from({length:1008},(_,i)=>({id:i+1,term:'word'+i,pool:'CORE_NOW'}))},navigator:{},alert(){}});
vm.runInContext(fs.readFileSync('app.v16.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
run("settings.shuffle=false;progress={};sessions={};settings.newLimit=10;for(let i=1;i<=120;i++)progress[i]={reviews:1,due:days(-i),interval:1};");
assert.equal(run('getMorningSession().ids.length'),40);
assert.equal(run('sessions.morning.newCount'),run('newTarget()'));
assert.equal(run('sessions.morning.ids[0]'),120);
assert.equal(run('morningSelection().deferred'),80+run('newTarget()'));
run('sessions={};progress={};for(let i=1;i<=35;i++)progress[i]={reviews:1,due:today(),interval:1};');
assert.equal(run('getMorningSession().ids.length'),40);
assert.equal(run('sessions.morning.newCount'),run('newTarget()'));
for(const [grade,old,expected] of [['hard',30,1],['good',0,1],['good',1,3],['good',3,7],['good',7,14],['good',14,30],['good',30,60],['good',60,60],['easy',0,3],['easy',1,7],['easy',30,60]]){
 run(`sessions={};progress={1:{reviews:1,interval:${old}}};queue=[vocab[0]];idx=0;mode='morning';gradeMorning('${grade}')`);
 assert.equal(run('progress[1].interval'),expected,grade+' '+old);
 run("queue=[vocab[0]];idx=0;mode='afternoon';gradeAfternoon('know')");
 assert.equal(run('progress[1].interval'),expected);
 run("queue=[vocab[0]];idx=0;gradeAfternoon('forgot')");
 assert.equal(run('progress[1].interval'),1);
}
run("progress={};for(let i=1;i<=120;i++)progress[i]={reviews:2,interval:1,due:today(),morningDate:i<=15?today():''};sessions={morning:{date:today(),ids:Array.from({length:120},(_,i)=>i+1),cursor:15,dueCount:120,newCount:0}};normalizeMorning();");
assert.equal(run('sessions.morning.ids.length'),40);assert.equal(run('sessions.morning.cursor'),15);
run("sessions={morning:{date:today(),ids:[1,1,2,3],cursor:1}};progress={1:{morningDate:today(),morningGrade:'hard',reviews:1}};normalizeMorning()");
assert.equal(run('sessions.morning.ids.filter(id=>id===1).length'),1);
assert.equal(run('sessions.morning.ids.length')<=40,true);
// Afternoon can be started early and still pick up later morning words, including Easy.
run("sessions={};progress={1:{morningDate:today(),morningGrade:'easy',reviews:1}};");
assert.equal(run('getAfternoonSession().ids.length'),0);
run("progress[2]={morningDate:today(),morningGrade:'good',reviews:1}");
assert.equal(run('getAfternoonSession().ids.length'),1);
// Migration never deletes completed work when more than 40 were already done.
run("progress={};sessions={morning:{date:today(),ids:Array.from({length:120},(_,i)=>i+1),cursor:55}};normalizeMorning()");
assert.equal(run('sessions.morning.ids.length'),55);assert.equal(run('sessions.morning.cursor'),55);
console.log('PASS: cap, backlog order, new allowance, all rating transitions, afternoon feedback, legacy sessions');

run("sessions={};progress={};for(let i=1;i<=1006;i++)progress[i]={reviews:1,due:today(),interval:3};");
assert.equal(run('getMorningSession().newCount'),2);
assert.equal(run('sessions.morning.ids.length'),40);
run("sessions={};progress={};for(let i=1;i<=1008;i++)progress[i]={reviews:1,due:today(),interval:3};");
assert.equal(run('getMorningSession().newCount'),0);
assert.equal(run('sessions.morning.ids.length'),40);
run("sessions={};progress={1:{reviews:1,due:today(),interval:1,morningGrade:'hard'},2:{reviews:1,due:today(),interval:30,morningGrade:'easy'}}");
assert.equal(run('morningSelection().reviews[0].id'),1);
console.log('PASS: new-word reservation, remaining fewer than five, no unseen words, Hard priority, Easy excluded');
