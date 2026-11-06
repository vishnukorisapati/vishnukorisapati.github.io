(() => {
  'use strict';
  document.documentElement.classList.add('js-motion');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, parent=document) => parent.querySelector(selector);
  const $$ = (selector, parent=document) => [...parent.querySelectorAll(selector)];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  // Accessible mobile navigation.
  const navToggle=$('#menu-toggle'), nav=$('#main-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') !== 'true';
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
      nav.classList.toggle('open', open);
    });
    $$('a',nav).forEach(link=>link.addEventListener('click',()=>{
      nav.classList.remove('open');navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-label','Open navigation');
    }));
    document.addEventListener('keydown',e=>{if(e.key==='Escape') {nav.classList.remove('open');navToggle.setAttribute('aria-expanded','false');}});
  }

  // Reveal only once visible; content remains accessible with motion preferences off.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if (entry.isIntersecting){ entry.target.classList.add('visible');revealObserver.unobserve(entry.target); }
      });
    },{threshold:.12});
    $$('.reveal').forEach(el=>revealObserver.observe(el));
  } else $$('.reveal').forEach(el=>el.classList.add('visible'));

  // Project case studies.
  $$('.expand-btn').forEach(button=>{
    const details=document.getElementById(button.getAttribute('aria-controls'));
    if(!details)return;
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',String(!open));
      details.hidden=open;
      $('.plus',button).textContent=open?'+':'−';
    });
  });

  // Skills explorer.
  const skills={
    ai:{name:'INTELLIGENCE\nLAYER',description:'Task-specific AI systems connecting external research, model reasoning, and structured outputs.',tags:['Autonomous AI Agents','LLM Integration','Multi-LLM Orchestration','Agent Workflow Design','Task-Specific Automation'],symbol:'✳',footer:'USED IN: AUTONOMOUS RESEARCH AGENTS'},
    backend:{name:'BACKEND\nENGINEERING',description:'Scalable services and APIs that connect AI applications to the rest of the platform.',tags:['Node.js','TypeScript','NestJS','Express','REST APIs','Microservices','System Design','JWT'],symbol:'▥',footer:'USED IN: TURGO.AI BACKEND SERVICES'},
    integrations:{name:'INTEGRATION\nENGINEERING',description:'Secure connections, provider integrations, and workflow nodes across third-party systems.',tags:['OAuth 2.0','REST Integrations','Webhooks','Custom Workflow Nodes','BrightData','Apify','Serper','SERP API'],symbol:'⌘',footer:'USED IN: WORKFLOW NODES & CONNECTORS'},
    data:{name:'DATA &\nASYNC SYSTEMS',description:'Queuing, messaging and persistence infrastructure for long-running automated tasks.',tags:['Redis','BullMQ','Kafka','MongoDB','ClickHouse','SQL','Event-Driven Architecture'],symbol:'▤',footer:'USED IN: ASYNCHRONOUS BACKEND PROCESSING'},
    tools:{name:'LANGUAGES\n& TOOLS',description:'Languages, developer tooling and deployment skills across the AI and backend stack.',tags:['TypeScript','JavaScript','Python','Java','C++','Docker','Git','GitHub','Cloud Computing','OOP'],symbol:'⌥',footer:'USED ACROSS: DEVELOPMENT & DEPLOYMENT'}
  };
  const skillButtons=$$('[data-skill]');
  function activateSkill(key,focus=false){
    const s=skills[key];if(!s)return;
    skillButtons.forEach(b=>{const active=b.dataset.skill===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active && focus)b.focus();});
    const active=skillButtons.find(b=>b.dataset.skill===key);
    $('#skill-panel').setAttribute('aria-labelledby',active.id);
    $('#skill-counter').textContent='LAYER_0'+(skillButtons.indexOf(active)+1)+' / ACTIVE';
    $('#skill-category-title').textContent=s.name;
    $('#skill-category-title').style.whiteSpace='pre-line';
    $('#skill-description').textContent=s.description;
    $('#skill-symbol').textContent=s.symbol;
    $('#skill-footer').textContent=s.footer;
    const tags=$('#skill-tags');tags.replaceChildren();
    s.tags.forEach(tag=>{const span=document.createElement('span');span.textContent=tag;tags.appendChild(span);});
  }
  skillButtons.forEach((b,i)=>{
    b.addEventListener('click',()=>activateSkill(b.dataset.skill));
    b.addEventListener('keydown',e=>{
      let j=i;
      if(e.key==='ArrowDown'||e.key==='ArrowRight')j=(i+1)%skillButtons.length;
      else if(e.key==='ArrowUp'||e.key==='ArrowLeft')j=(i-1+skillButtons.length)%skillButtons.length;
      else if(e.key==='Home')j=0;
      else if(e.key==='End')j=skillButtons.length-1;
      else return;
      e.preventDefault();activateSkill(skillButtons[j].dataset.skill,true);
    });
  });

  // A pure Canvas 3D projection, no external libraries required. Five isometric
  // modules are drawn as 3D cuboids with depth sorting and moving execution packets.
  const nodeDefs=[
    {name:'TRIGGER',sub:'event',x:-2.4,z:-1.6,w:1.27,depth:.88},
    {name:'QUEUE',sub:'async',x:-2.8,z:1.65,w:1.27,depth:.88},
    {name:'AGENT',sub:'research',x:0,z:0,w:1.46,depth:1.05},
    {name:'LLM',sub:'reason',x:2.6,z:-1.7,w:1.25,depth:.92},
    {name:'CALLBACK',sub:'result',x:2.65,z:1.38,w:1.38,depth:.95}
  ];
  const links=[[0,1],[1,2],[2,3],[3,4],[4,0]];
  const statusMessages=[
    'event.received → validating request',
    'queue.dispatched → worker scheduled',
    'agent.running → external tools called',
    'llm.reasoning → output generated',
    'callback.delivered → task complete ✓'
  ];
  const faces={idle:{top:'#3d6356',left:'#264b40',right:'#1b4037',line:'#7eac97'},active:{top:'#e14b50',left:'#ab333b',right:'#8c2b36',line:'#ff9e8f'},done:{top:'#5caa83',left:'#356e56',right:'#235640',line:'#a9ebc2'}};
  class EngineScene {
    constructor(canvas,kind){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.kind=kind;
      this.stage=0;this.manual=false;this.paused=reduceMotion;this.elapsed=kind==='hero'?450:1000;
      this.lastTime=0;this.visible=true;this.pointer=0;this.pointerSmooth=0;
      this.colors={bg:'#16362e'};
      canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();this.pointer=clamp((e.clientX-r.left)/r.width-.5,-.5,.5);},{passive:true});
      canvas.addEventListener('pointerleave',()=>this.pointer=0);
    }
    project(x,y,z){
      const ca=Math.cos(this.yaw),sa=Math.sin(this.yaw);
      const rx=x*ca-z*sa,rz=x*sa+z*ca;
      return {x:this.cx+(rx-rz)*this.scale*.755,y:this.cy+(rx+rz)*this.scale*.367-y*this.scale*.85,d:rx+rz};
    }
    path(points,fill,stroke,lineWidth=1){
      const c=this.ctx;c.beginPath();points.forEach((p,i)=>{if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y)});c.closePath();
      if(fill){c.fillStyle=fill;c.fill()}
      if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke()}
    }
    line(a,b,color,width=1,dash=[]){
      const c=this.ctx;c.beginPath();c.setLineDash(dash);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();c.setLineDash([]);
    }
    shadow(x,y,amount=24){
      const c=this.ctx,grad=c.createRadialGradient(x,y,0,x,y,amount);
      grad.addColorStop(0,'#030d0b75');grad.addColorStop(1,'#030d0b00');c.fillStyle=grad;c.beginPath();c.ellipse(x,y,amount,amount*.43,0,0,Math.PI*2);c.fill();
    }
    drawGrid(){
      const c=this.ctx;
      const w=this.w,h=this.h;
      // lit floor with world-space grid; rotating camera makes it genuinely 3D-projected
      for(let x=-5;x<=5;x+=.5){
        const a=this.project(x,-.08,-4),b=this.project(x,-.08,4);
        this.line(a,b,'#6ab59515',.7);
      }
      for(let z=-4;z<=4;z+=.5){
        const a=this.project(-5,-.08,z),b=this.project(5,-.08,z);
        this.line(a,b,'#6ab59515',.7);
      }
      const corners=[this.project(-4.1,-.09,-3.1),this.project(4.1,-.09,-3.1),this.project(4.1,-.09,3.1),this.project(-4.1,-.09,3.1)];
      this.path(corners,'#40645608','#83af9440',1);
      const top=this.project(0,0,0);
      const glow=c.createRadialGradient(top.x,top.y,5,top.x,top.y,Math.min(w,h)*.58);
      glow.addColorStop(0,'#7dc29e11');glow.addColorStop(1,'#1b342900');c.fillStyle=glow;c.fillRect(0,0,w,h);
    }
    drawWire(a,b,active,ack=false){
      const c=this.ctx;
      const start=this.project(a.x,.17,a.z),end=this.project(b.x,.17,b.z);
      const mid=this.project((a.x+b.x)/2,.14,(a.z+b.z)/2);
      // raised cable guides
      c.save();c.beginPath();c.moveTo(start.x,start.y);c.quadraticCurveTo(mid.x,mid.y-9,end.x,end.y);
      c.strokeStyle=active?(ack?'#79e4af':'#f87677'):'#83bc9b86';c.lineWidth=active?2.5:1.3;
      c.setLineDash(active?[]:[5,6]);c.stroke();c.restore();
      if(active){
        let f=(this.elapsed%1850)/1850;
        for(let i=0;i<3;i++){
          const t=(f+i/3)%1;
          const px=(1-t)*(1-t)*start.x+2*(1-t)*t*mid.x+t*t*end.x;
          const py=(1-t)*(1-t)*start.y+2*(1-t)*t*(mid.y-9)+t*t*end.y;
          const radius=(i===0?4.2:2.4)*(this.scale/53);
          c.save();c.shadowBlur=17;c.shadowColor=ack?'#67e5a8':'#ff646b';c.fillStyle=ack?'#9afcc2':'#ff8283';
          c.beginPath();c.arc(px,py,Math.max(1.7,radius),0,Math.PI*2);c.fill();c.restore();
        }
      }
    }
    drawCube(node,index,active){
      const c=this.ctx,h=active?.72:.46;
      const x=node.x,z=node.z,w=node.w/2,d=node.depth/2;
      const base=[this.project(x-w,0,z-d),this.project(x+w,0,z-d),this.project(x+w,0,z+d),this.project(x-w,0,z+d)];
      const top=[this.project(x-w,h,z-d),this.project(x+w,h,z-d),this.project(x+w,h,z+d),this.project(x-w,h,z+d)];
      const center=this.project(x,0,z);
      this.shadow(center.x,center.y+6,Math.max(22,this.scale*.82));
      const status=active?faces.active:index<this.stage?faces.done:faces.idle;
      this.path([base[3],base[2],top[2],top[3]],status.left,'#51766c',.8);
      this.path([base[1],base[2],top[2],top[1]],status.right,'#51766c',.8);
      this.path(top,status.top,status.line,1.1);
      // tiny blinking worker status LEDs
      const p=this.project(x+w*.53,h+.015,z);
      c.save();c.shadowBlur=active?13:0;c.shadowColor='#ff7a79';c.fillStyle=active?'#fff4ed':'#a4d5b6';c.beginPath();c.arc(p.x,p.y,2.4,0,Math.PI*2);c.fill();c.restore();
      // Label plate floats above the cuboid, maintaining its screen legibility.
      const anchor=this.project(x,h+.52,z);
      const plateW=clamp(this.scale*1.74,53,110),plateH=clamp(this.scale*.70,27,43);
      const sx=anchor.x-plateW/2,sy=anchor.y-plateH/2;
      c.fillStyle='#071b1766';c.fillRect(sx+5,sy+6,plateW,plateH);
      c.fillStyle=active?'#d83d43':'#edf3e9';c.fillRect(sx,sy,plateW,plateH);
      c.fillStyle=active?'#ffffff':'#1e322b';c.font=`700 ${clamp(this.scale*.215,8,13)}px Arial`;
      c.textAlign='center';c.textBaseline='middle';c.fillText(node.name,anchor.x,sy+plateH*.40,plateW-7);
      c.font=`${clamp(this.scale*.145,7,9)}px monospace`;c.fillStyle=active?'#fff0e9':'#65776b';c.fillText(node.sub.toUpperCase(),anchor.x,sy+plateH*.76,plateW-7);
      c.fillStyle=active?'#ffb49e':'#a5baa7';c.fillRect(sx,sy+plateH-2,plateW,2);
      if(active){
        // independent moving work satellites orbit the active agent.
        const radius=this.scale*(index===2?.83:.62);
        for(let k=0;k<2;k++){
          let a=this.elapsed*.0017+k*Math.PI;
          const xx=anchor.x+Math.cos(a)*radius,yy=anchor.y+Math.sin(a)*radius*.31;
          c.save();c.fillStyle=k?'#9ce2bc':'#ff9894';c.shadowBlur=12;c.shadowColor='#ec716d';c.beginPath();c.arc(xx,yy,Math.max(2,this.scale*.055),0,Math.PI*2);c.fill();c.restore();
        }
      }
    }
    render(time){
      if(!this.ctx||!this.visible)return;
      const rect=this.canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
      if(w<1||h<1)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.75);
      if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){
        this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
      }
      this.w=w;this.h=h;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.clearRect(0,0,w,h);
      const dt=this.lastTime?Math.min(time-this.lastTime,70):16;this.lastTime=time;
      if(!this.paused&&!reduceMotion)this.elapsed+=dt;
      this.pointerSmooth+=(this.pointer-this.pointerSmooth)*.055;
      this.scale=Math.min(w/9.1,h/6.3);
      this.cx=w*.5;this.cy=h*(this.kind==='story'?.55:.51);
      this.yaw=this.pointerSmooth*.17+(this.kind==='hero' && !reduceMotion?Math.sin(this.elapsed*.00025)*.045:0);
      this.stage=this.manual?this.stage:Math.floor(this.elapsed/2400)%5;
      this.drawGrid();
      links.forEach(([i,j])=>this.drawWire(nodeDefs[i],nodeDefs[j],i===this.stage,j===0));
      nodeDefs.map((n,index)=>({n,index,depth:this.project(n.x,0,n.z).d})).sort((a,b)=>a.depth-b.depth).forEach(({n,index})=>this.drawCube(n,index,index===this.stage));
      // Visual process code as translucent annotations in the background.
      if(w>375){const c=this.ctx;c.font='9px monospace';c.fillStyle='#b9cfbb7d';c.textAlign='left';c.fillText('EVENT_BUS / ASYNC',16,h-12);c.textAlign='right';c.fillText('5 EXECUTION NODES',w-15,h-12);}
    }
    setStage(n){this.manual=true;this.stage=clamp(n,0,4);}
    replay(){this.manual=false;this.elapsed=0;this.paused=false;this.lastTime=0;}
  }
  const heroScene=new EngineScene($('#engine-canvas'),'hero');
  const storyScene=new EngineScene($('#story-canvas'),'story');
  storyScene.manual=true;storyScene.paused=reduceMotion;storyScene.setStage(0);
  // Draw only when on-screen, keeping scroll fluid.
  if('IntersectionObserver' in window){
    const watcher=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.target===heroScene.canvas)heroScene.visible=e.isIntersecting;if(e.target===storyScene.canvas)storyScene.visible=e.isIntersecting;});},{threshold:0});
    watcher.observe(heroScene.canvas);watcher.observe(storyScene.canvas);
  }
  let lastDisplayedStage=-1;
  function tick(t){
    if(document.visibilityState!=='hidden'){
      heroScene.render(t);storyScene.render(t);
      if(heroScene.stage!==lastDisplayedStage){
        lastDisplayedStage=heroScene.stage;
        $('#hero-log').textContent=statusMessages[heroScene.stage];
        $('#hero-progress').style.width=((heroScene.stage+1)*20)+'%';
      }
    }
    if(!reduceMotion)window.requestAnimationFrame(tick);
  }
  tick(0);
  const pauseBtn=$('#pause-engine');
  pauseBtn.addEventListener('click',()=>{
    heroScene.paused=!heroScene.paused;
    pauseBtn.textContent=heroScene.paused?'▷ PLAY':'Ⅱ PAUSE';
    pauseBtn.setAttribute('aria-label',heroScene.paused?'Play engine simulation':'Pause engine simulation');
    if(reduceMotion){heroScene.elapsed+=2400;heroScene.render(performance.now());}
  });
  $('#replay-engine').addEventListener('click',()=>{
    heroScene.replay();pauseBtn.textContent='Ⅱ PAUSE';pauseBtn.setAttribute('aria-label','Pause engine simulation');
    if(reduceMotion){heroScene.render(performance.now());}
  });

  // Scroll-driven active step. The 3D diagram is sticky; the stage actually changes
  // as the step heading passes the center line, rather than playing an unrelated loop.
  const walkSteps=$$('.walk-step');
  let currentWalk=-1,stepQueued=false;
  function syncWalk(){
    stepQueued=false;
    if(!walkSteps.length)return;
    const targetY=window.innerHeight*.55;
    let index=0,best=Infinity;
    walkSteps.forEach((el,i)=>{
      const rect=el.getBoundingClientRect();
      const dist=Math.abs(rect.top+rect.height*.42-targetY);
      if(dist<best){best=dist;index=i;}
    });
    if(index===currentWalk)return;
    currentWalk=index;
    walkSteps.forEach((el,i)=>el.classList.toggle('active',i===index));
    storyScene.setStage(index);
    $('#walk-stage').textContent='0'+(index+1)+' / '+nodeDefs[index].name;
    $('#walk-label').textContent=nodeDefs[index].name;
    $('#story-progress-fill').style.width=((index+1)*20)+'%';
    if(reduceMotion)storyScene.render(performance.now());
  }
  function queueWalk(){if(stepQueued)return;stepQueued=true;requestAnimationFrame(syncWalk);}
  window.addEventListener('scroll',queueWalk,{passive:true});
  window.addEventListener('resize',queueWalk,{passive:true});
  syncWalk();
  if(reduceMotion){heroScene.render(performance.now());storyScene.render(performance.now());}
})();
