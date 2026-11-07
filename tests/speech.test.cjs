const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
function setup(supported=true,session={type:'auto'}){
 const el={textContent:''},listeners={},timers=new Map(),spoken=[];let next=0;
 const synth={paused:true,speaking:false,pending:false,cancels:0,resumes:0,resume(){this.paused=false;this.resumes++},cancel(){this.cancels++},speak(u){spoken.push(u)}};
 const window=supported?{navigator:{audioSession:session},speechSynthesis:synth,SpeechSynthesisUtterance:function(text){this.text=text}}:{};
 const document={getElementById:()=>el,addEventListener(n,f){listeners[n]=f}};
 vm.runInNewContext(fs.readFileSync('speech.v19.js','utf8'),{window,document,setTimeout:f=>{timers.set(++next,f);return next},clearTimeout:i=>timers.delete(i)});
 return {window,document,el,synth,listeners,timers,spoken};
}
let t=setup();t.window.FE_SPEECH.stop();assert.equal(t.synth.cancels,0);
t.window.FE_SPEECH.speak('parabola',.75);
assert.equal(t.window.navigator.audioSession.type,'playback');assert.equal(t.spoken[0].text,'parabola');assert.equal(t.spoken[0].volume,1);assert.equal(t.spoken[0].rate,.75);assert.equal(t.spoken[0].voice,undefined);
t.spoken[0].onstart();t.spoken[0].onend();assert.equal(t.timers.size,0);
t.window.FE_SPEECH.speak('focus',.75,{replay:true});assert.match(t.el.textContent,/复读：focus/);
const old=t.spoken[1];t.window.FE_SPEECH.speak('vertex',.75,{replay:true});old.onend();assert.match(t.el.textContent,/vertex/);
[...t.timers.values()][0]();assert.match(t.el.textContent,/没有响应/);
t.window.FE_SPEECH.speak('test',.75);t.document.hidden=true;t.listeners.visibilitychange();assert.equal(t.timers.size,0);
t=setup(false);t.window.FE_SPEECH.speak('test',.75);assert.match(t.el.textContent,/不支持/);
for(const session of [undefined,Object.defineProperty({},'type',{set(){throw Error('unsupported')}})]){
 t=setup(true,session);t.window.FE_SPEECH.speak('test',.75);assert.equal(t.spoken.length,1);
}
console.log('PASS: playback session, compatibility fallback, replay label, stale callbacks, timeout, hidden cleanup, default voice');
