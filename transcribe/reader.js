// Read only the requested minute of a Blob; never decode the entire meeting.
export async function openRecording(blob){
  const {Input,ALL_FORMATS,BlobSource,AudioBufferSink}=await import('https://cdn.jsdelivr.net/npm/mediabunny@1.65.2/+esm');
  const input=new Input({formats:ALL_FORMATS,source:new BlobSource(blob)});
  try{
    const track=await input.getPrimaryAudioTrack();
    if(!track)throw Error('文件中没有音轨');
    const duration=await track.computeDuration();
    if(!Number.isFinite(duration)||duration<=0)throw Error('无法读取录音长度');
    if(!(await track.canDecode()))throw Error('此浏览器无法分段解码这份录音。请更新系统，或在支持此音频格式的电脑浏览器打开同一网页；不需要安装软件。');
    const sink=new AudioBufferSink(track);
    return {duration,close:()=>input.dispose(),async read(start,end,cancelled=()=>false){
      const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
      if(!Offline)throw Error('此浏览器不支持音频处理');
      const context=new Offline(1,Math.ceil((end-start)*16000),16000);
      for await(const {buffer,timestamp} of sink.buffers(start,end)){
        if(cancelled())throw Error('已暂停');
        const left=Math.max(start,timestamp),right=Math.min(end,timestamp+buffer.duration);
        if(right<=left)continue;
        const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
        source.start(left-start,left-timestamp,right-left);
      }
      if(cancelled())throw Error('已暂停');
      return (await context.startRendering()).getChannelData(0);
    }};
  }catch(error){input.dispose();throw error;}
}
