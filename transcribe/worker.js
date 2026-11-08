import {pipeline,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
let model;
self.onmessage=async({data})=>{try{model??=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{device:'wasm',dtype:'q8',progress_callback:p=>self.postMessage({type:'download',file:p.file,status:p.status,progress:p.progress})});self.postMessage({type:'running'});const options={return_timestamps:true,chunk_length_s:30,stride_length_s:5,task:'transcribe'};if(data.language)options.language=data.language;const result=await model(data.audio,options);self.postMessage({type:'done',result});}catch(e){self.postMessage({type:'error',message:e.message||String(e)});}};
