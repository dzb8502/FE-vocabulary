// Keep speech state alive and start audio directly inside the user's tap.
(function(root){
  const synth=root.speechSynthesis;
  let voices=[],active=null,timer=null,serial=0,useDefault=true;
  const status=(text)=>{const el=document.getElementById('speechStatus');if(el)el.textContent=text;};
  function loadVoices(){try{voices=synth?synth.getVoices():[]}catch(_){voices=[]}}
  function clearTimer(){if(timer!==null){clearTimeout(timer);timer=null}}
  function stop(){const wasActive=active!==null;serial++;clearTimer();active=null;if(synth&&wasActive)try{synth.cancel()}catch(_){}status('')}
  function speak(text,rate,alternate=false){
    if(!text)return;
    if(!synth||typeof root.SpeechSynthesisUtterance!=='function'){
      status('当前浏览器不支持发音，请在 Safari 或 Chrome 中打开。');return;
    }
    const id=++serial;clearTimer();
    try{
      // Do not cancel an idle engine before every word: it can disrupt mobile playback.
      if(active||synth.speaking||synth.pending)synth.cancel();
      active=null;
      if(synth.paused)synth.resume();
      if(alternate)loadVoices();
      const u=new root.SpeechSynthesisUtterance(String(text));
      active=u;u.lang='en-US';u.volume=1;u.pitch=1;
      u.rate=Number.isFinite(Number(rate))?Math.max(.5,Math.min(1.5,Number(rate))):.75;
      const english=voices.filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
      const voice=english.find(v=>v.localService&&/^en[-_]US$/i.test(v.lang))||english.find(v=>v.localService)||english.find(v=>/^en[-_]US$/i.test(v.lang))||english[0];
      if(voice&&alternate){u.voice=voice;u.lang=voice.lang;}
      u.onstart=()=>{if(id!==serial)return;clearTimer();status('');};
      u.onend=()=>{if(id!==serial)return;clearTimer();active=null;status('');};
      u.onerror=e=>{
        if(id!==serial)return;clearTimer();active=null;useDefault=true;
        status(e.error==='not-allowed'?'发音被浏览器阻止，请再次点喇叭；仍无声可用 Safari 打开。':'发音未成功，请再点喇叭重试（将使用系统默认英语语音）。');
      };
      status('');
      timer=setTimeout(()=>{
        if(id!==serial)return;
        stop();status('系统发音没有响应，可点“换语音”再试。');
      },3000);
      synth.speak(u);
      if(synth.paused)synth.resume();
    }catch(_){clearTimer();active=null;useDefault=true;status('发音暂不可用，请再点喇叭或重新打开页面。');}
  }
  loadVoices();
  if(synth&&synth.addEventListener)synth.addEventListener('voiceschanged',loadVoices);
  if(document.addEventListener)document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();else{loadVoices();}
  });
  root.FE_SPEECH={speak,stop};
})(window);
