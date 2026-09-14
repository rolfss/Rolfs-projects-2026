(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', {alpha:false});
  const bg = new Image(), kari = new Image(); bg.src='assets/fjord-harbor.png'; kari.src='assets/kari.png';
  const SAVE_KEY='vedtak-adventure-v1', keys=new Set(), pressed=new Set();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W=1280,H=720,time=0,last=0,acc=0,mode='menu',levelIndex=0,level,player,camera=0;
  let score=0,coins=0,trust=[],deaths=0,elapsed=0,levelElapsed=0,combo=0,comboTime=0,coffee=0,shake=0;
  let particles=[],floaters=[],toastTime=0,checkpoint=0,boss=null,bossShots=[],levelScore=0,runMedals=[],levelDamage=0;
  let nextAction=()=>{},audio=null,musicTimer=null,musicStep=0,soundOn=false,save={unlocked:0,best:0,medals:[]};
  try {const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&Number.isFinite(s.unlocked))save={unlocked:clamp(s.unlocked,0,2),best:Number(s.best)||0,medals:Array.isArray(s.medals)?s.medals:[]};}catch{}
  const worlds=[
    {name:'Kommunekaia',subtitle:'Alle skal med. Også vedlegget.',goal:'Finn veien gjennom kommunekaia. Samle tillit og lever tjenester helt fram til innbyggeren.',color:'#72ead2',dark:'#163d42',enemy:'Vedlegg mangler',end:'Innbyggertorget',purpose:'Enklere hverdag',lines:['Velkommen! Hopp to ganger med SPACE.','En god tjeneste starter med å se innbyggeren.','Kaffepause er også en del av beredskapen.']},
    {name:'Arkivverket',subtitle:'Ingenting er borte. Bare feilregistrert.',goal:'Noen har arkivert utgangen under «Diverse». Finn den, og ta vare på sporene som skaper tillit.',color:'#ffc182',dark:'#433549',enemy:'Versjon FINAL 7',end:'Åpent arkiv',purpose:'Åpenhet og sporbarhet',lines:['Arkivet husker. Også det møtet.','Innsyn gir lys i papirjungelen.','Denne snarveien er journalført.']},
    {name:'Digitaliseringsfjellet',subtitle:'Én dør inn. Sytten systemer bak.',goal:'Koble sammen siloene og stans Saksbehandlingskøen. Hopp på toppen når den åpner for innspill!',color:'#a7abff',dark:'#202b58',enemy:'Silo.exe',end:'Samfunnsoppdraget',purpose:'Sammenhengende tjenester',lines:['Digitalisering: mennesket først. Passordet etterpå.','Samhandling slår siloer. Kaffedash slår begge.','Køen er sårbar når den åpner for innspill.']}
  ];

  function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{}}
  function updateContinue(){ $('continue').classList.toggle('hidden',save.unlocked===0);if(save.unlocked)$('continue').textContent=`FORTSETT: ${worlds[save.unlocked].name.toUpperCase()}`; }
  function resize(){const r=canvas.parentElement.getBoundingClientRect();W=Math.round(clamp(r.width/r.height*720,540,1700));canvas.width=W;canvas.height=H;}
  new ResizeObserver(resize).observe(canvas.parentElement);resize();
  function tone(freq,duration=.12,type='sine',gain=.04,slide=1){if(!soundOn||!audio)return;const now=audio.currentTime,o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),now+duration);v.gain.setValueAtTime(.0001,now);v.gain.exponentialRampToValueAtTime(gain,now+.008);v.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(v);v.connect(audio.destination);o.start(now);o.stop(now+duration+.02);}
  function sfx(name){if(name==='coin'){tone(880,.08,'sine',.035,1.5)}else if(name==='jump'){tone(240,.14,'triangle',.06,2.2)}else if(name==='dash'){tone(150,.18,'sawtooth',.022,4)}else if(name==='hurt'){tone(180,.25,'sawtooth',.045,.3)}else if(name==='stomp'){tone(130,.13,'square',.035,.4)}else if(name==='letter'){[523,659,784,1047].forEach((n,i)=>setTimeout(()=>tone(n,.22,'triangle',.06),i*75))}else if(name==='win'){[392,523,659,784,1047].forEach((n,i)=>setTimeout(()=>tone(n,.35,'triangle',.06),i*110));}}
  function toggleSound(){soundOn=!soundOn;if(soundOn){audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});if(!musicTimer)musicTimer=setInterval(musicTick,165)}$('sound').innerHTML=`♫ <span>LYD ${soundOn?'PÅ':'AV'}</span>`;$('sound').setAttribute('aria-label',soundOn?'Slå av lyd':'Slå på lyd');if(soundOn)tone(659,.15);}
  function musicTick(){if(!soundOn||document.hidden||mode==='pause')return;const progression=[0,0,5,3],root=[146.83,174.61,164.81][levelIndex]||146.83;const chord=progression[Math.floor(musicStep/16)%4];const seq=[0,7,12,15,19,15,12,7,0,7,10,14,17,14,10,7];tone(root*2**((seq[musicStep%16]+chord)/12),.36,'triangle',.016);if(musicStep%4===0)tone(root/2*2**(chord/12),.45,'sine',.055);if(musicStep%4===2)tone(62,.045,'triangle',.055,.3);musicStep++;}
  function toast(text,duration=3.5){$('toast').textContent=text;$('toast').classList.remove('hidden');toastTime=duration;}
  function burst(x,y,color,n=16,power=170){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,life:.4+Math.random()*.6,max:1,color,size:2+Math.random()*4});}if(particles.length>350)particles.splice(0,particles.length-350);}
  function label(text,x,y,color='#ffe096'){floaters.push({text,x,y,life:1.3,color})}
  function award(points,x,y,text){score+=points;label(text||`+${points}`,x,y);}
  function rect(x,y,w,h,fill,r=0){ctx.fillStyle=fill;if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}else ctx.fillRect(x,y,w,h);}
  function text(str,x,y,size=18,color='#fff0ca',align='center',weight=700){ctx.font=`${weight} ${size}px Barlow,Arial,sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(str,x,y);}

  function makeLevel(index){
    const a=(x,y,w,kind='dock',extra={})=>({x,y,w,h:24,kind,...extra});
    const platforms=[a(-100,610,760),a(785,590,415),a(1320,560,380),a(1820,610,475),a(2450,565,420),a(3030,605,470),a(3650,605,700),
      a(350,478,150),a(610,390,110),a(965,440,145),a(1420,402,140),a(1640,320,120),a(1970,450,140),a(2190,340,110),a(2600,405,150),a(2830,315,120),a(3190,450,145),a(3430,370,120),a(3900,440,130)];
    if(index===1){platforms[1].y=570;platforms[3].y=585;platforms.push(a(1190,465,100,'lift',{baseY:465,range:70,speed:1.2}),a(2900,510,110,'lift',{baseY:510,range:60,speed:1.5}));}
    if(index===2){platforms.push(a(1170,475,110,'lift',{baseY:475,range:60,speed:1.1}),a(2310,480,110,'lift',{baseY:480,range:75,speed:1.5}));platforms[6].w=950;platforms.push(a(4220,445,130),a(4500,605,500));}
    const pickups=[];
    platforms.forEach((p,j)=>{if(p.kind==='lift')return;const count=j<7?Math.floor(p.w/90):3;for(let k=0;k<count;k++)pickups.push({x:p.x+45+k*(p.w-70)/Math.max(1,count-1),y:p.y-45,w:24,h:24,type:'coin',taken:false,phase:j+k});});
    const letters=[[430,428],[1025,390],[1690,267],[2235,290],[2880,263],[3480,320]];
    letters.forEach(([x,y],i)=>pickups.push({x,y,w:36,h:42,type:'letter',index:i,taken:false}));
    [[560,562],[1490,353],[2720,516],[3990,390]].forEach(([x,y])=>pickups.push({x,y,w:32,h:32,type:'coffee',taken:false}));
    const enemies=[];[1,2,3,4,5,6].forEach((n,i)=>{const p=platforms[n];enemies.push({x:p.x+140,y:p.y-40,w:44,h:40,vx:(i%2?1:-1)*(index*12+55),left:p.x+25,right:p.x+p.w-65,baseY:p.y-40,dead:false,type:index,phase:i});});
    if(index>0)[12,15,16].forEach((n,i)=>{const p=platforms[n];enemies.push({x:p.x+20,y:p.y-44,w:44,h:40,vx:45,left:p.x+5,right:p.x+p.w-45,baseY:p.y-44,dead:false,type:index,phase:i});});
    return {platforms,pickups,enemies,width:index===2?4970:4330,exit:index===2?4830:4170,
      springs:[{x:670,y:544,w:64,h:60},{x:2918,y:525,w:64,h:60}],
      checkpoints:[{x:1870,y:610,active:false},{x:3070,y:605,active:false}],
      signs:[{x:155,y:610,text:'INNBYGGEREN FØRST'},{x:1940,y:610,text:index===1?'BEVARES FOR ETTERTIDEN':'KAFFE · TILLIT · FREMDRIFT'},{x:3740,y:605,text:index===2?'ÅPENT FOR INNSPILL ↓':'MINDRE KØ. MER LIV.'}],
      secrets:[{x:2835,y:245,w:120,h:70,taken:false}],intro:worlds[index]};
  }
  function spawnPlayer(x=85,y=520){player={x,y,w:38,h:58,vx:0,vy:0,face:1,onGround:false,jumps:0,coyote:0,jumpBuffer:0,dash:0,dashCool:0,invuln:1.5,hp:3,squash:0,trail:[]};}
  function loadLevel(index){levelIndex=index;level=makeLevel(index);trust=[];camera=0;coffee=0;combo=0;checkpoint=0;particles=[];floaters=[];bossShots=[];levelElapsed=0;levelScore=score;spawnPlayer();boss=index===2?{x:4350,y:440,w:145,h:165,hp:6,max:6,timer:0,phase:'closed',invuln:0,active:false}:null;
    levelDamage=0;$('worldTag').textContent=`KAPITTEL 0${index+1} / 03`;$('worldName').textContent=worlds[index].name;
  }
  function begin(index=0){score=0;coins=0;deaths=0;elapsed=0;runMedals=[];loadLevel(index);$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('progress').classList.remove('hidden');showDialog(`KAPITTEL 0${index+1}`,worlds[index].name,worlds[index].goal,'LA OSS FÅ NOE GJORT',()=>resume(),'intro');}
  function resume(){if(!player||!level){menu();return}mode='play';$('help').disabled=false;$('dialog').classList.add('hidden');$('touch').classList.add('playing');keys.clear();pressed.clear();canvas.focus({preventScroll:true});}
  function showDialog(eyebrow,title,body,action,callback,newMode='pause',stats=''){mode=newMode;$('help').disabled=true;keys.clear();pressed.clear();$('dialogEyebrow').textContent=eyebrow;$('dialogTitle').textContent=title;$('dialogText').textContent=body;$('dialogAction').textContent=action;$('dialogStats').innerHTML=stats;nextAction=callback;$('dialog').classList.remove('hidden');$('dialog').scrollTop=0;$('touch').classList.remove('playing');$('dialogAction').focus({preventScroll:true});}
  function pause(){if(mode==='play')showDialog('EN VELFORTJENT PAUSE','Saken er satt på vent.','Ta en slurk kaffe. Samfunnsoppdraget løper ingen steder.','TILBAKE TIL OPPDRAGET',resume);else if(mode==='pause')resume();}
  function menu(){mode='menu';$('help').disabled=false;$('dialog').classList.add('hidden');$('hud').classList.add('hidden');$('progress').classList.add('hidden');$('touch').classList.remove('playing');$('toast').classList.add('hidden');$('menu').classList.remove('hidden');keys.clear();updateContinue();$('start').focus({preventScroll:true});}
  function finish(){if(mode!=='play')return;sfx('win');const medals=(trust.filter(Boolean).length===6?1:0)+(levelDamage===0?1:0)+(levelElapsed<100?1:0);const bonus=1000+trust.filter(Boolean).length*150;score+=bonus;runMedals[levelIndex]=medals;save.best=Math.max(score,save.best);save.medals[levelIndex]=Math.max(save.medals[levelIndex]||0,medals);save.unlocked=Math.max(save.unlocked,Math.min(2,levelIndex+1));persist();
    const stats=`<div><strong>${score.toLocaleString('nb-NO')}</strong>samfunnsnytte</div><div><strong>${trust.filter(Boolean).length}/6</strong>tillitsbokstaver</div><div><strong>${Math.floor(levelElapsed)} s</strong>saksbehandlingstid</div><div><strong>${'★'.repeat(medals)}${'☆'.repeat(3-medals)}</strong>tillit · skadefri · under 100 s</div>`;
    if(levelIndex<2)showDialog('VEDTAK: GODKJENT!',`${worlds[levelIndex].purpose} ✓`,`${worlds[levelIndex].end} er åpent. +${bonus} samfunnsnytte! Neste stopp: ${worlds[levelIndex+1].name}.`,'NESTE KAPITTEL →',()=>{loadLevel(levelIndex+1);showDialog(`KAPITTEL 0${levelIndex+1}`,worlds[levelIndex].name,worlds[levelIndex].goal,'VIDERE MED OPPDRAGET',resume,'intro')},'complete',stats);
    else showDialog('SAMFUNNSOPPDRAGET ER UTFØRT','Det ble faktisk enklere.',`Du slo køen og fikk tjenestene helt fram til folk. Kari tar helg. Møtereferatet skriver seg selv. Personlig rekord: ${save.best.toLocaleString('nb-NO')}.`,'SPILL IGJEN',()=>begin(0),'win',stats);
  }
  function damage(fall=false){if(mode!=='play'||(!fall&&player.invuln>0))return;player.hp--;levelDamage++;combo=0;shake=reduced?0:9;player.invuln=1.6;sfx('hurt');burst(player.x+20,player.y+20,'#ff967e',20);if(fall||player.hp<=0){deaths++;const hp=player.hp;const x=checkpoint?level.checkpoints[checkpoint-1].x+40:85;const y=checkpoint?level.checkpoints[checkpoint-1].y-85:520;spawnPlayer(x,y);player.hp=hp>0?hp:3;camera=clamp(player.x-W*.32,0,level.width-W);toast(hp<=0?'Ny giv! Arbeidslysten er tilbake.':'Du havnet i utredningen. Tilbake til siste kaffepause.',2.7);}else{player.vx=-player.face*220;player.vy=-350;toast('Auda. Dette tar vi til orientering.',1.8)}}

  function update(dt){
    time+=dt;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.add('hidden');}
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
    floaters.forEach(f=>{f.y-=34*dt;f.life-=dt});floaters=floaters.filter(f=>f.life>0);
    if(mode!=='play'){pressed.clear();return}elapsed+=dt;levelElapsed+=dt;coffee=Math.max(0,coffee-dt);shake=Math.max(0,shake-30*dt);comboTime-=dt;if(comboTime<=0)combo=0;
    const p=player;const dir=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
    p.invuln=Math.max(0,p.invuln-dt);p.dashCool=Math.max(0,p.dashCool-dt);p.dash=Math.max(0,p.dash-dt);p.coyote=Math.max(0,p.coyote-dt);p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
    if(pressed.has('Space')||pressed.has('ArrowUp')||pressed.has('KeyW'))p.jumpBuffer=.13;
    if(p.jumpBuffer>0&&(p.onGround||p.coyote>0||p.jumps<2)){p.vy=p.jumps===0?-665:-605;p.jumps++;p.jumpBuffer=0;p.onGround=false;p.coyote=0;p.squash=-.13;sfx('jump');burst(p.x+18,p.y+p.h,'#caeee1',8,70)}
    if((pressed.has('KeyX')||pressed.has('ShiftLeft')||pressed.has('ShiftRight'))&&p.dashCool<=0){p.dash=.2;p.dashCool=coffee>0?.38:.9;p.vy*=.2;sfx('dash');burst(p.x+18,p.y+30,'#ffd878',12,120)}
    if(dir)p.face=dir;const target=dir*(coffee>0?335:280);p.vx=p.dash>0?p.face*780:p.vx+(target-p.vx)*Math.min(1,dt*(p.onGround?17:8));
    if(p.dash<=0)p.vy=Math.min(1050,p.vy+1840*dt);else{p.vy=0;p.trail.push({x:p.x,y:p.y,life:.2})}
    p.trail.forEach(v=>v.life-=dt);p.trail=p.trail.filter(v=>v.life>0);p.squash*=.83;
    const oldBottom=p.y+p.h;p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,0,level.width-p.w);p.onGround=false;
    for(const platform of level.platforms){const oldY=platform.y;if(platform.kind==='lift')platform.y=platform.baseY+Math.sin(time*platform.speed)*platform.range;
      if(p.vy>=0&&p.x+p.w>platform.x+2&&p.x<platform.x+platform.w-2&&oldBottom<=oldY+14&&p.y+p.h>=platform.y){p.y=platform.y-p.h;if(p.vy>450){p.squash=.16;burst(p.x+20,platform.y,'#bdd8c3',5,45)}p.vy=0;p.onGround=true;p.jumps=0;p.coyote=.10;}}
    if(p.y>H+140)damage(true);
    for(const s of level.springs){if(hit(p,s)&&p.vy>=0&&oldBottom<s.y+40){p.y=s.y-p.h;p.vy=-1020;p.vx=450;p.jumps=1;sfx('dash');burst(s.x+32,s.y,'#8ef1d8',26,230);label('EKSPEDERT!',s.x+30,s.y-50,'#a1ffe4')}}
    for(const item of level.pickups){if(item.taken)continue;if(hit(p,{x:item.x-8,y:item.y-8,w:item.w+16,h:item.h+16})){item.taken=true;burst(item.x+12,item.y+12,item.type==='coffee'?'#e8c296':'#ffe68a',10,110);if(item.type==='coin'){coins++;combo++;comboTime=2.1;award(10*Math.min(5,1+Math.floor(combo/5)),item.x,item.y);sfx('coin');if(combo===10)toast('FLYTSONE! Samfunnsnytten multipliseres.',2)}else if(item.type==='letter'){trust[item.index]=true;award(250,item.x,item.y,`TILLIT +250`);sfx('letter');if(trust.filter(Boolean).length===6){award(1000,item.x,item.y-45,'FULL TILLIT +1000');toast('Full TILLIT! Ingen ekstra kontrollskjema nødvendig.')}}else{coffee=10;p.hp=Math.min(3,p.hp+1);sfx('letter');toast('KAFFEKRAFT! Raskere bein, raskere dash. +1 arbeidslyst.',3)}}}
    for(const e of level.enemies){if(e.dead)continue;e.x+=e.vx*dt;if(e.x<e.left||e.x>e.right){e.vx*=-1;e.x=clamp(e.x,e.left,e.right)}if(hit(p,e)){if(p.dash>0||(p.vy>80&&oldBottom<e.y+19)){e.dead=true;p.vy=p.dash>0?-250:-490;p.jumps=1;combo++;comboTime=2;award(100+Math.min(combo,5)*20,e.x,e.y,'BEHANDLET!');burst(e.x+20,e.y+20,'#f4e7c9',24,220);sfx('stomp')}else damage()}}
    level.checkpoints.forEach((cp,i)=>{if(!cp.active&&p.x>cp.x&&p.x<cp.x+110&&p.y+p.h>cp.y-130){cp.active=true;checkpoint=i+1;p.hp=3;burst(cp.x+20,cp.y-65,'#8de7c9',22);toast('Kaffepause lagret. Full arbeidslyst!');sfx('letter');}});
    level.secrets.forEach(s=>{if(!s.taken&&hit(p,s)){s.taken=true;award(750,s.x,s.y,'HEMMELIG DUGNAD +750');toast('Du fant dugnadsgjengen! Utenfor mandat. Innenfor hjertet.');sfx('letter');burst(s.x+50,s.y+20,'#93f4e0',36,250)}});
    if(boss)updateBoss(dt,oldBottom);
    const desired=clamp(p.x-W*.35,0,Math.max(0,level.width-W));camera+=(desired-camera)*Math.min(1,dt*5);
    if(p.x>level.exit&&(!boss||boss.hp<=0))finish();
    if(p.x>level.exit&&boss&&boss.hp>0){p.x=level.exit-10;toast('Køen sperrer døren. Gi den et innspill ovenfra!',2)}
    $('score').textContent=String(score).padStart(5,'0');$('letters').textContent='TILLIT'.split('').map((l,i)=>trust[i]?l:'·').join(' ');$('hearts').textContent='♥ '.repeat(p.hp)+'♡ '.repeat(3-p.hp);$('progressFill').style.width=`${clamp(p.x/level.exit*100,0,100)}%`;
    pressed.clear();
  }
  function updateBoss(dt,oldBottom){if(boss.hp<=0)return;boss.active=player.x>3820;if(!boss.active)return;boss.timer+=dt;boss.invuln=Math.max(0,boss.invuln-dt);const cycle=boss.timer%5.4;boss.phase=cycle>2.8?'open':'closed';boss.y=440+Math.sin(boss.timer*1.6)*7;
    if(cycle<2.8&&Math.floor(boss.timer*2)!==boss.lastShot){boss.lastShot=Math.floor(boss.timer*2);bossShots.push({x:boss.x,y:boss.y+95,w:22,h:16,vx:-230,vy:-30});}
    bossShots.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=45*dt;if(hit(player,s)){s.x=-100;damage()}});bossShots=bossShots.filter(s=>s.x>camera-50&&s.y<750);
    if(hit(player,boss)){if(boss.phase==='open'&&player.vy>50&&oldBottom<boss.y+42&&boss.invuln<=0){boss.hp--;boss.invuln=.8;player.vy=-700;player.jumps=1;player.invuln=1;award(350,boss.x+60,boss.y-30,'INNSPILL MOTTATT!');burst(boss.x+70,boss.y,'#ffd67e',40,290);sfx('stomp');shake=reduced?0:10;if(boss.hp<=0){award(2500,boss.x,boss.y-60,'KØEN ER BORTE!');burst(boss.x+60,boss.y+80,'#9af6de',90,420);sfx('win');toast('Køen er borte. Løp fram og fullfør samfunnsoppdraget!',5)}}else if(boss.invuln<=0)damage();}
  }

  function drawBackground(){
    rect(0,0,W,H,'#081e30');
    if(bg.complete&&bg.naturalWidth){const bh=H+130,bw=bh*1.5,offset=(mode==='menu'?0:camera*.16)%bw;for(let i=-1;i<Math.ceil(W/bw)+1;i++){const x=i*bw-offset;ctx.save();if(Math.abs(i)%2){ctx.translate(x+bw,-70);ctx.scale(-1,1);ctx.drawImage(bg,0,0,bw,bh)}else ctx.drawImage(bg,x,-70,bw,bh);ctx.restore();}}
    if(mode!=='menu'&&levelIndex===1){rect(0,0,W,H,'#161424ba');for(let i=0;i<12;i++){const x=i*190-camera*.35%190;rect(x,130,150,480,'#291f32');rect(x+4,128,142,9,'#79576a');for(let j=0;j<7;j++){rect(x+10,155+j*60,130,45,'#41333e');rect(x+17,158+j*60,115,3,'#80635e');rect(x+58,167+j*60,38,13,'#bfa877');rect(x+67,171+j*60,21,2,'#5d544b');}}}
    if(mode!=='menu'&&levelIndex===2){rect(0,0,W,H,'#191737a8');for(let i=0;i<10;i++){let x=i*230-camera*.26%230;let y=160+(i%3)*40;rect(x,y,150,H-y,'#172645ad');ctx.strokeStyle='#6479a73b';ctx.lineWidth=1;for(let j=0;j<8;j++){ctx.strokeRect(x+12,y+12+j*45,125,33);rect(x+23,y+25+j*45,5,5,j%2?'#70d1bf':'#8b8ff1')}}}
    const haze=ctx.createLinearGradient(0,400,0,H);haze.addColorStop(0,'#03273400');haze.addColorStop(1,'#02202fcc');ctx.fillStyle=haze;ctx.fillRect(0,400,W,320);
    for(let i=0;i<45;i++){const x=((i*137.2-camera*.28+Math.sin(time*.4+i)*18)%(W+100)+W+100)%(W+100);const y=100+(i*71)%540+Math.sin(time*.6+i)*14;ctx.globalAlpha=.18+(Math.sin(time+i)+1)*.18;rect(x,y,i%4===0?3:2,i%4===0?3:2,'#ffe69d');}ctx.globalAlpha=1;
  }
  function drawPlatform(p){const x=Math.round(p.x-camera),y=Math.round(p.y);if(x+p.w<0||x>W)return;const col=worlds[levelIndex];
    if(p.kind==='lift'){ctx.shadowColor=col.color;ctx.shadowBlur=12;rect(x,y,p.w,8,col.color,3);ctx.shadowBlur=0;rect(x+8,y+8,p.w-16,12,'#223e51',3);return;}
    const high=p.y<500;rect(x,y+7,p.w,high?25:45,levelIndex===1?'#55404a':'#423b38');rect(x,y,p.w,9,levelIndex===2?'#8496b9':levelIndex===1?'#c3a47c':'#a09c77');rect(x,y+9,p.w,5,levelIndex===2?'#3dddc5':'#d9c292');
    for(let bx=0;bx<p.w;bx+=35){rect(x+bx,y+2,2,33,'#182c3290');rect(x+bx+7,y+19,19,2,'#af957f55');}
    rect(x,y+35,p.w,7,'#12272f');if(!high){for(let bx=25;bx<p.w;bx+=130){rect(x+bx,y+40,12,130,'#253b3d');rect(x+bx+2,y+40,3,130,'#62766b77');ctx.strokeStyle='#344849';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x+bx,y+80);ctx.lineTo(x+bx+80,y+44);ctx.stroke();}}
    else{rect(x+10,y+32,10,19,'#344347');rect(x+p.w-20,y+32,10,19,'#344347');}
    if(levelIndex===2){for(let b=12;b<p.w;b+=80)rect(x+b,y+23,23,3,'#82edcf');}
  }
  function drawCoin(item){const x=item.x-camera+12,y=item.y+12+Math.sin(time*3+(item.phase||0)) * 5;if(x<-40||x>W+40)return;
    if(item.type==='coin'){ctx.save();ctx.translate(x,y);ctx.scale(.72+Math.abs(Math.sin(time*2+(item.phase||0)))*.28,1);ctx.shadowColor='#ffc966';ctx.shadowBlur=12;ctx.fillStyle='#f2b64f';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffedb1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();text('✦',0,5,13,'#80522b');ctx.restore();}
    else if(item.type==='letter'){ctx.save();ctx.translate(x+4,y+6);ctx.rotate(Math.sin(time*1.8+item.index)*.1);ctx.shadowColor='#88fbd9';ctx.shadowBlur=17;rect(-19,-24,38,45,'#ffe0a0',5);ctx.shadowBlur=0;ctx.strokeStyle='#ac682b';ctx.lineWidth=3;ctx.strokeRect(-14,-19,28,35);text('TILLIT'[item.index],0,8,26,'#294f48', 'center',800);ctx.restore();}
    else{ctx.save();ctx.translate(x,y);ctx.shadowColor='#f9edbb';ctx.shadowBlur=12;rect(-10,-10,23,24,'#f7ead2',3);ctx.shadowBlur=0;ctx.strokeStyle='#f7ead2';ctx.lineWidth=3;ctx.strokeRect(13,-6,8,13);rect(-7,-7,17,4,'#765033');text('♥',1,9,11,'#b54d46');ctx.strokeStyle='#cce6df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-14);ctx.quadraticCurveTo(4,-20,-2,-25+Math.sin(time*3)*3);ctx.stroke();ctx.restore();}
  }
  function drawEnemy(e){const x=e.x-camera,y=e.y+Math.sin(time*7+e.phase)*2;if(x<-80||x>W+80)return;ctx.save();ctx.translate(x+22,y+20);ctx.rotate(Math.sin(time*8+e.phase)*.04);
    if(e.type===2){rect(-23,-21,46,39,'#52688b',5);rect(-18,-17,36,26,'#132d43',3);text('×  ×',0,-1,17,'#b9b6ff');rect(-12,4,24,3,'#e397a7');}
    else{for(let i=0;i<4;i++){rect(-23+(i%2)*4,-17+i*8,44,8,i%2?'#d7c6a3':'#fff0cd');rect(-15,-14+i*8,22,2,'#a59386');}rect(-11,-4,5,5,'#352c39');rect(8,-4,5,5,'#352c39');ctx.strokeStyle='#71333e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,10);ctx.lineTo(6,7);ctx.stroke();}
    rect(-18,20,12,6,'#1b2b39',3);rect(8,20,12,6,'#1b2b39',3);ctx.restore();
  }
  function drawHero(x,y,size=85,face=1,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x+19,y+58);ctx.scale(face,1);if(mode==='play'){const bob=player.onGround?Math.sin(time*19)*Math.min(Math.abs(player.vx)/100,2):0;ctx.translate(0,bob);ctx.rotate(player.dash>0?face*.22:clamp(player.vx/2500,-.12,.12));ctx.scale(1+player.squash,1-player.squash);}
    if(kari.complete&&kari.naturalWidth)ctx.drawImage(kari,230,0,850,1254,-size*.35,-size,size*.7,size);else{rect(-14,-48,30,38,'#e95148',6);rect(-12,-65,26,24,'#efc08d',6);rect(-13,-10,10,10,'#233746');rect(5,-10,10,10,'#233746')}
    ctx.restore();}
  function drawCheckpoint(cp){const x=cp.x-camera;if(x<-80||x>W+80)return;rect(x+8,cp.y-99,5,99,'#96a79a');ctx.fillStyle=cp.active?'#83e8ce':'#d1b37d';ctx.beginPath();ctx.moveTo(x+13,cp.y-99);ctx.lineTo(x+63,cp.y-91+Math.sin(time*2)*3);ctx.lineTo(x+13,cp.y-63);ctx.fill();text('✓',x+31,cp.y-77,22,cp.active?'#19453e':'#594c3a');rect(x-10,cp.y-9,38,9,'#879086',3);}
  function drawSpring(s){const x=s.x-camera,y=s.y;if(x<-100||x>W+100)return;ctx.save();ctx.translate(x+32,y+40);ctx.rotate(.4);rect(-23,-38,46,54,'#1c5364',5);rect(-27,-42,54,12,'#86d7cb',3);rect(-19,-30,38,3,'#d7e5c2');text('↑',0,-6,24,'#ffdf91');ctx.restore();text('EKSPRESS',x+28,y+66,10,'#b0d9d3');}
  function drawBoss(){if(!boss||boss.hp<=0)return;const b=boss,x=b.x-camera,y=b.y;ctx.save();if(b.invuln>0)ctx.globalAlpha=.5+Math.sin(time*35)*.3;ctx.translate(x+b.w/2,y);ctx.rotate(Math.sin(time*2)*.025);for(let i=0;i<8;i++){rect(-72+(i%2)*5,i*20,140,19,i%2?'#acaaa0':'#e0d2b0',2);rect(-59,5+i*20,75,3,'#827779');}rect(-76,-10,152,18,b.phase==='open'?'#9ce8c8':'#cc6c78',4);text(b.phase==='open'?'ÅPENT FOR INNSPILL':'SAKSBEHANDLINGSKØ',0,-21,13,b.phase==='open'?'#a8ffe1':'#ffd0ba');rect(-40,44,24,26,'#202d44',4);rect(19,44,24,26,'#202d44',4);rect(-35,52,12,8,'#fff0bd');rect(23,52,12,8,'#fff0bd');rect(-28,92,58,12,'#28374a',4);ctx.restore();
    if(b.active){rect(W/2-150,102,300,12,'#192f3b',6);rect(W/2-148,104,296*b.hp/b.max,8,b.phase==='open'?'#9bead0':'#e39183',5);text('KØEN: '+b.hp+' / '+b.max,W/2,96,12,'#f5d5b7');}
    for(const s of bossShots){rect(s.x-camera,s.y,s.w,s.h,'#f1dab5',2);rect(s.x-camera+3,s.y+5,14,2,'#af6466');}
  }
  function draw(){
    ctx.save();if(shake>0&&!reduced)ctx.translate(Math.sin(time*70)*shake*.4,Math.cos(time*60)*shake*.3);drawBackground();
    if(mode==='menu'){if(kari.complete&&kari.naturalWidth){const sz=W<800?310:465,x=W<800?W-290:W*.57,y=W<800?395:155;ctx.save();ctx.translate(x+sz,y+Math.sin(time*1.7)*(reduced?0:6));ctx.scale(-1,1);ctx.shadowColor='#15344e';ctx.shadowBlur=30;ctx.drawImage(kari,0,0,sz,sz);ctx.restore();}ctx.restore();return;}
    if(!level){ctx.restore();return;}
    for(const s of level.signs){const x=s.x-camera;rect(x,s.y-90,5,90,'#6e796a');rect(x-25,s.y-100,175,28,'#113b48',3);rect(x-25,s.y-100,175,2,'#88c4b8');text(s.text,x+61,s.y-82,10,'#d7e7ce');}
    level.platforms.forEach(drawPlatform);level.checkpoints.forEach(drawCheckpoint);level.springs.forEach(drawSpring);
    level.secrets.forEach(s=>{if(s.taken)return;const x=s.x-camera;ctx.globalAlpha=.3+Math.sin(time*3)*.12;text('✦  DUGNAD  ✦',x+60,s.y-10,12,'#adffe0');ctx.globalAlpha=1});
    for(const item of level.pickups)if(!item.taken)drawCoin(item);for(const e of level.enemies)if(!e.dead)drawEnemy(e);drawBoss();
    const exit=level.exit-camera;ctx.shadowColor=worlds[levelIndex].color;ctx.shadowBlur=20;rect(exit-20,425,82,180,'#5c9e9955',9);ctx.shadowBlur=0;ctx.strokeStyle=worlds[levelIndex].color;ctx.lineWidth=4;ctx.strokeRect(exit-20,425,82,180);text('✓',exit+22,492,50,'#dcffc8');text(worlds[levelIndex].end.toUpperCase(),exit+20,409,11,'#dcebd1');text('MÅL',exit+20,583,14,'#f7e9c2');
    for(const trail of player.trail)drawHero(trail.x-camera,trail.y,85,player.face,trail.life*.9);
    if(player.invuln<=0||Math.floor(time*12)%2===0)drawHero(player.x-camera,player.y,85,player.face);
    if(coffee>0){const x=player.x-camera+19,y=player.y-42;rect(x-26,y,52,5,'#173d45',3);rect(x-26,y,52*coffee/10,5,'#ffd07c',3);if(Math.sin(time*16)>.7)burst(player.x+10,player.y+40,'#fce5a3',1,35);}
    for(const p of particles){ctx.globalAlpha=clamp(p.life*1.6,0,1);rect(p.x-camera,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
    for(const f of floaters){ctx.globalAlpha=clamp(f.life*2,0,1);text(f.text,f.x-camera,f.y,16,f.color);}ctx.globalAlpha=1;
    if(combo>=5)text(`FLYT ×${Math.min(5,1+Math.floor(combo/5))}`,W-40,160,23,'#ffe0a0','right',800);
    if(player.x<300&&levelElapsed<12){text('DOBBELTHOPP',310-camera,350,14,'#def4e6');text('SPACE  +  SPACE',310-camera,373,12,'#acd5d1');}
    ctx.restore();
  }
  function frame(now){if(!last)last=now;acc+=Math.min(.05,(now-last)/1000);last=now;while(acc>=1/60){update(1/60);acc-=1/60;}draw();requestAnimationFrame(frame);}
  function keyDown(e){const active=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyD','KeyX','ShiftLeft','ShiftRight'];if(active.includes(e.code)&&mode==='play')e.preventDefault();if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='KeyM')toggleSound();}
  addEventListener('keydown',keyDown);addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();pressed.clear();if(mode==='play')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause()});
  for(const button of document.querySelectorAll('[data-key]')){const code=button.dataset.key;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(!keys.has(code))pressed.add(code);keys.add(code)});const up=()=>keys.delete(code);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);}
  $('start').onclick=()=>begin(0);$('continue').onclick=()=>begin(save.unlocked);$('dialogAction').onclick=()=>nextAction();$('dialogSecondary').onclick=menu;$('pause').onclick=pause;$('sound').onclick=toggleSound;
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await canvas.parentElement.requestFullscreen();}catch{toast('Fullskjerm støttes ikke i denne nettleseren.')}};
  $('help').onclick=()=>{if(mode!=='menu'&&mode!=='play')return;const previous=mode;showDialog('KARI SIN HURTIGVEILEDER','Mindre møte. Mer bevegelse.','Piltaster eller A/D: gå. SPACE, W eller ↑: hopp — trykk igjen i lufta for dobbelthopp. X eller Shift: kaffedash gjennom papirbunker. Hopp på fiender ovenfra. Kaffekopper gir fart og helse. Flagg lagrer sjekkpunkt. Samle alle seks TILLIT-bokstavene, finn dugnadssnarveien og nå utgangen. På mobil bruker du knappene på skjermen.','SKJØNT!',()=>previous==='menu'?menu():resume(),'help');};
  document.addEventListener('keydown',e=>{if($('dialog').classList.contains('hidden')||e.key!=='Tab')return;const buttons=[$('dialogAction'),$('dialogSecondary')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[1].focus()}else if(!e.shiftKey&&document.activeElement===buttons[1]){e.preventDefault();buttons[0].focus()}});
  // Read-only game state for accessibility helpers and browser verification.
  window.Vedtak=Object.freeze({snapshot:()=>({mode,level:levelIndex,score,coins,trust:trust.filter(Boolean).length,checkpoint,deaths,elapsed,coffee,player:player?{x:player.x,y:player.y,vx:player.vx,vy:player.vy,hp:player.hp,jumps:player.jumps,onGround:player.onGround}:null,boss:boss?{hp:boss.hp,phase:boss.phase}:null}),worlds:worlds.map(w=>w.name)});
  updateContinue();requestAnimationFrame(frame);
})();
