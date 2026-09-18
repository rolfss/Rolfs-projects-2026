import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const address='http://127.0.0.1:4173';
async function available(){try{const r=await fetch(address,{signal:AbortSignal.timeout(1000)});return r.ok&&(await r.text()).includes('FJORDSPRINT');}catch{return false;}}
if(!await available()){
 const server=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{detached:true,stdio:'ignore',windowsHide:true});server.unref();
 for(let i=0;i<25&&!await available();i++)await new Promise(resolve=>setTimeout(resolve,200));
 if(!await available()){console.error('The game could not start at '+address+'. Another application may be using this address.');process.exit(1);}
}
if(process.platform==='win32'){const browser=spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${address}'`],{stdio:'ignore',windowsHide:true});browser.unref();}
else if(process.platform==='darwin'){spawn('open',[address],{stdio:'ignore'}).unref();}
else{spawn('xdg-open',[address],{stdio:'ignore'}).unref();}
console.log('FJORDSPRINT is ready: '+address);
