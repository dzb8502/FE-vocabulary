const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
function setup(supported=true){
 const el={textContent:''},listeners={},timers=new Map(),spoken=[];let next=0;
 const synth={voices:[],paused:true,speaking:false,pending:false,cancels:0,resumes:0,getVoices(){return this.voices},resume(){this.paused=false;this.resumes++},cancel(){this.cancels++},speak(u){spoken.push(u)},addEventListener(n,f){listeners[n]=f}};
 const window=supported?{speechSynthesis:synth,SpeechSynthesisUtterance:function(text){this.text=text}}:{};
 const document={getElementById:()=>el,addEventListener(n,f){listeners[n]=f}};
 vm.runInNewContext(fs.readFileSync('speech.v19.js','utf8'),{window,document,setTimeout:f=>{timers.set(++next,f);return next},clearTimeout:i=>timers.delete(i)});
 return {window,document,el,synth,listeners,timers,spoken};
}
let t=setup();t.window.FE_SPEECH.speak('parabola',.75);
assert.equal(t.spoken.length,1);assert.equal(t.spoken[0].text,'parabola');assert.equal(t.spoken[0].rate,.75);assert.equal(t.synth.cancels,0);assert.equal(t.synth.paused,false);
t.spoken[0].onstart();assert.equal(t.timers.size,0);t.spoken[0].onend();assert.equal(t.el.textContent,'');
t.synth.voices=[{lang:'zh-CN'},{lang:'en-US',localService:true}];t.listeners.voiceschanged();t.window.FE_SPEECH.speak('focus',.75);assert.equal(t.spoken[1].voice,t.synth.voices[1]);
t.spoken[1].onerror({error:'voice-unavailable'});t.window.FE_SPEECH.speak('focus',.75);assert.equal(t.spoken[2].voice,undefined);assert.equal(t.spoken[2].lang,'en-US');
const old=t.spoken[2];t.window.FE_SPEECH.speak('vertex',.75);const before=t.el.textContent;old.onerror({error:'canceled'});assert.equal(t.el.textContent,before);
[...t.timers.values()][0]();assert.match(t.el.textContent,/未启动/);
t.document.hidden=true;t.listeners.visibilitychange();assert.equal(t.timers.size,0);
t=setup(false);t.window.FE_SPEECH.speak('test',.75);assert.match(t.el.textContent,/不支持/);
console.log('PASS: empty/delayed voices, resume, retained utterance, voice fallback, stale callbacks, timeout, unsupported browser');
