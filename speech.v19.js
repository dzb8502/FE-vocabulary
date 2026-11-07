// Speech starts synchronously in the user's tap; retain the utterance until completion.
(function(root){
  const synth=root.speechSynthesis;
  let active=null,timer=null,serial=0;
  const status=text=>{const el=document.getElementById('speechStatus');if(el)el.textContent=text;};
  function clearTimer(){if(timer!==null){clearTimeout(timer);timer=null}}
  function playbackSession(){
    // Feature detection is essential: older browsers do not expose AudioSession.
    // Request media playback, without forcing a speaker or overriding Bluetooth routing.
    try{if(root.navigator&&root.navigator.audioSession)root.navigator.audioSession.type='playback';}catch(_){}
  }
  function stop(){const wasActive=active!==null;serial++;clearTimer();active=null;if(synth&&wasActive)try{synth.cancel()}catch(_){}status('')}
  function speak(text,rate,options={}){
    if(!text)return;
    if(!synth||typeof root.SpeechSynthesisUtterance!=='function'){
      status('当前浏览器不支持发音，请在 Safari 或 Chrome 中打开。');return;
    }
    const id=++serial;clearTimer();
    const label=options.replay?'复读：'+text:'';
    const finish=message=>{if(id!==serial)return;clearTimer();active=null;status(message);};
    try{
      if(active||synth.speaking||synth.pending)synth.cancel();
      active=null;playbackSession();
      if(synth.paused)synth.resume();
      const u=new root.SpeechSynthesisUtterance(String(text));
      active=u;u.lang='en-US';u.volume=1;u.pitch=1;
      u.rate=Number.isFinite(Number(rate))?Math.max(.5,Math.min(1.5,Number(rate))):.75;
      u.onstart=()=>{if(id!==serial)return;clearTimer();status(label);
        timer=setTimeout(()=>{if(id!==serial)return;stop();status('发音已停止，可点发音按钮重试。');},20000);
      };
      u.onend=()=>finish('');
      u.onerror=e=>finish(e.error==='not-allowed'?'请点发音按钮重试。':'发音未成功，请点发音按钮重试。');
      status(label);
      timer=setTimeout(()=>{if(id!==serial)return;stop();status('系统发音没有响应，请点发音按钮重试。');},3000);
      synth.speak(u);
      if(synth.paused)synth.resume();
    }catch(_){finish('发音暂不可用，请点发音按钮或重新打开页面。');}
  }
  if(document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  root.FE_SPEECH={speak,stop};
})(window);
