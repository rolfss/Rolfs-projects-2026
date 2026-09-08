// Original, quiet procedural sound design. No recordings of historical events.
export type SoundRoom='hall'|'paper'|'server'|'room'|'tunnel'|'clock';
const profiles:Record<SoundRoom,{filter:number;hum:number;level:number}>={hall:{filter:180,hum:62,level:.04},paper:{filter:440,hum:74,level:.025},server:{filter:850,hum:96,level:.055},room:{filter:230,hum:65,level:.018},tunnel:{filter:115,hum:48,level:.045},clock:{filter:320,hum:82,level:.02}};
export class MuseumAudio{
  ctx:AudioContext|null=null;gain:GainNode|null=null;volume=.22;enabled=false;
  private paused=false;private quiet=false;private starting=false;private room:SoundRoom='hall';private noise:AudioBuffer|null=null;
  private filter:BiquadFilterNode|null=null;private hum:OscillatorNode|null=null;private humGain:GainNode|null=null;private ambient:GainNode|null=null;private beat=0;
  async start(){
    if(this.starting)return;this.starting=true;
    try{
      if(!this.ctx){const ctx=this.ctx=new AudioContext();this.gain=ctx.createGain();this.gain.gain.value=0;this.gain.connect(ctx.destination);
        this.noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
        const source=ctx.createBufferSource();source.buffer=this.noise;source.loop=true;this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.55;
        this.ambient=ctx.createGain();this.ambient.gain.value=.09;source.connect(this.filter);this.filter.connect(this.ambient);this.ambient.connect(this.gain);source.start();
        this.hum=ctx.createOscillator();this.hum.type='sine';this.humGain=ctx.createGain();this.hum.connect(this.humGain);this.humGain.connect(this.ambient);this.hum.start();
        window.setInterval(()=>{if(!this.enabled||this.paused||document.hidden||this.quiet)return;this.beat++;if(this.room==='clock')this.transient(1600,.055,.055,this.beat%2?.25:-.25);if(this.room==='paper'&&this.beat%4===0)this.transient(2200,.32,.055,-.6);},1000);
      }
      await this.ctx.resume();this.enabled=true;this.applyRoom();this.applyVolume();
    }finally{this.starting=false;}
  }
  private applyVolume(){if(this.gain&&this.ctx)this.gain.gain.setTargetAtTime(this.enabled&&!this.paused?this.volume:0,this.ctx.currentTime,.35);}
  setVolume(v:number){this.volume=Math.max(0,Math.min(.7,v));this.applyVolume();}
  async toggle(){if(this.enabled){this.enabled=false;this.applyVolume();}else await this.start();}
  pause(p:boolean){this.paused=p;this.applyVolume();}
  setRoom(room:SoundRoom){if(room===this.room)return;this.room=room;this.quiet=false;this.beat=0;this.applyRoom();}
  setOutcome(safe:boolean|null){this.quiet=safe===false;this.applyRoom();}
  private applyRoom(){if(!this.ctx)return;const p=profiles[this.room],t=this.ctx.currentTime;this.filter?.frequency.setTargetAtTime(this.quiet?80:p.filter,t,.6);this.hum?.frequency.setTargetAtTime(p.hum,t,.6);this.humGain?.gain.setTargetAtTime(p.level,t,.6);this.ambient?.gain.setTargetAtTime(this.quiet?.018:.09,t,.7);}
  private transient(frequency:number,duration:number,level:number,pan:number){
    if(!this.ctx||!this.gain||!this.noise||!this.enabled||this.paused)return;
    const ctx=this.ctx,t=ctx.currentTime,s=ctx.createBufferSource();s.buffer=this.noise;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;
    const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(level,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    const panner=ctx.createStereoPanner();panner.pan.value=pan;const delay=ctx.createDelay(.4),echo=ctx.createGain();delay.delayTime.value=this.room==='tunnel'?.28:.12;echo.gain.value=.16;
    s.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(this.gain);panner.connect(delay);delay.connect(echo);echo.connect(this.gain);s.start(t,Math.random()*2,duration);
    s.onended=()=>window.setTimeout(()=>{for(const node of [s,filter,gain,panner,delay,echo])node.disconnect();},450);
  }
  step(){this.transient(380,.15,.11,this.beat++%2?.2:-.2);}
}
