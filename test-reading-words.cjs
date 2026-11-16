const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync(__dirname+'/app.v16.js','utf8'),bundle=fs.readFileSync(__dirname+'/vocab.v16.js','utf8');
function boot(initial={}){
const storage={...initial},nodes={};function node(){return {value:'',style:{},classList:{add(){},remove(){}},children:[],dataset:{},replaceChildren(...c){this.children=c},append(...c){this.children.push(...c)},focus(){},showModal(){},close(){},click(){}}}
let uid=0;const c={console,Date,Uint32Array,crypto:{getRandomValues:r=>r.fill(1),randomUUID:()=>`test-${++uid}`},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},document:{getElementById:id=>nodes[id]??=(node()),querySelectorAll:()=>[],createElement:node},window:{},navigator:{},alert:()=>{},confirm:()=>true,Blob:function(parts){this.parts=parts;c.exported=parts[0]},URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
vm.createContext(c);vm.runInContext(bundle,c);vm.runInContext(app,c);return {c,nodes,storage,run:s=>vm.runInContext(s,c)};
}
(async()=>{
let t=boot();const total=t.run('vocab.length');assert.equal(total,1008);
const original=t.run('vocab[500]');t.c.term=original.term;
t.run('start("morning")');const count=t.run('sessions.morning.ids.length');
t.run('addReadingWord("  "+term.toUpperCase()+"  ","ignored")');
assert.equal(t.run('vocab.length'),1008);t.c.id=original.id;
assert.equal(t.run('p(id).morningGrade'),'hard');assert.equal(t.run('p(id).due'),t.run('days(1)'));assert.equal(t.run('p(id).reviews'),1);assert.equal(t.run('p(id).morningDate'),'');assert.equal(t.run('p(id).firstSeen'),t.run('today()'));
assert(t.run('getAfternoonSession().ids.includes(id)'));assert(!t.run('morningSelection().fresh.some(v=>v.id===id)'));
t.run('addReadingWord(term)');assert.equal(t.run('p(id).reviews'),1);assert.equal(t.run('p(id).history.length'),1);
t.run('progress[id].history.push({date:"2020-01-01",value:"good"});progress[id].manualHardDate="2020-01-01";progress[id].interval=30;addReadingWord(term)');assert.equal(t.run('p(id).history.length'),3);assert.equal(t.run('p(id).interval'),1);
const pending=t.run('sessions.morning.ids[sessions.morning.cursor]');t.c.pending=pending;t.run('addReadingWord(vocab.find(v=>v.id===pending).term)');assert(!t.run('sessions.morning.ids.slice(sessions.morning.cursor).includes(pending)'));assert(t.run('sessions.morning.ids.length<=40'));
t.run('addReadingWord("quux reading word","测试释义")');assert.equal(t.run('vocab.length'),1009);assert.equal(t.run('customWords.length'),1);const custom=t.run('customWords[0].id');assert.equal(t.run('findWord("QUUX   reading word").zh'),'测试释义');
t.run('addReadingWord("quux reading word")');assert.equal(t.run('vocab.length'),1009);
const reboot=boot(t.storage);assert.equal(reboot.run('vocab.length'),1009);reboot.c.id=custom;assert.equal(reboot.run('p(id).morningGrade'),'hard');
reboot.nodes.exportBtn.onclick();const backup=JSON.parse(reboot.c.exported);assert.equal(backup.customWords.length,1);
const imported=boot();await imported.nodes.importFile.onchange({target:{files:[{text:async()=>JSON.stringify(backup)}]}});assert.equal(imported.run('vocab.length'),1009);imported.c.id=custom;assert.equal(imported.run('p(id).morningGrade'),'hard');
await imported.nodes.importFile.onchange({target:{files:[{text:async()=>JSON.stringify(backup)}]}});assert.equal(imported.run('vocab.length'),1009);
// User-provided words are rendered as text, never HTML.
imported.run('addReadingWord("<img src=x onerror=alert(1)>","<script>bad</script>")');imported.nodes.filter.value='ALL';imported.nodes.search.value='<img';imported.run('renderResults()');assert.equal(imported.nodes.results.children[0].children[0].textContent,'<img src=x onerror=alert(1)>');
imported.run('settings.shuffle=false;start("afternoon")');assert(imported.run('queue.some(v=>v.id===id)'));imported.run('idx=queue.findIndex(v=>v.id===id);gradeAfternoon("know")');assert.equal(imported.run('p(id).interval'),1);
imported.nodes.resetBtn.onclick();assert.equal(imported.run('customWords.length'),2);assert.equal(imported.run('p(id).reviews'),0);
assert.throws(()=>imported.run('addReadingWord("   ")'));
console.log('PASS: existing/unseen match, Hard and next-day schedule, afternoon eligibility, history, duplicate submission, active queue removal/cap, custom persistence/export/import/reset, safe rendering.');
})().catch(e=>{console.error(e);process.exit(1)});
