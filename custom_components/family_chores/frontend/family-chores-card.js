class FamilyChoresCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._hass=null;this.view='today';this.data={members:[],today_tasks:[],week_tasks:[],tasks:[],scores:{},weekly_scores:{},weekly_goals:{},rewards:[],family_fund_balance:0,savings_goals:[],active_savings_goal:null,donation_history:[]};}
  setConfig(config){this.config=config||{};}
  set hass(h){const first=!this._hass;this._hass=h;if(first)this.load();}
  getCardSize(){return 6;}
  getGridOptions(){return {columns:"full",rows:"auto",min_columns:6};}
  async ws(type,payload={}){return this._hass.callWS({type,...payload});}
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async load(){try{this.data=await this.ws('family_chores/get_data');this.render();}catch(e){this.shadowRoot.innerHTML=`<ha-card><div style="padding:16px">Family Chores: ${this.esc(e.message||e)}</div></ha-card>`;}}
  memberTasks(member){
    if(this.view==='all')return (this.data.tasks||[]).filter(t=>(t.assignees||[]).includes(member)||(t.rotation||[]).includes(member));
    const source=this.view==='week'?(this.data.week_tasks||[]):(this.data.today_tasks||[]);
    return source.filter(t=>(t.assignees_current||[]).includes(member));
  }
  dayLabel(ds){if(!ds)return '';const d=new Date(ds+'T12:00:00');return ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()];}
  recurrenceLabel(t){const m={once:'Einmalig',daily:'Täglich',weekdays:'Wochentage',weekly:'Wöchentlich',every_n_weeks:`Alle ${t.interval_weeks||2} Wochen`,monthly:'Monatlich'};return m[t.recurrence]||t.recurrence||'';}
  render(){
    const cols=Math.max(1,(this.data.members||[]).length);
    this.shadowRoot.innerHTML=`<style>
      *{box-sizing:border-box}:host{display:block;width:100%;max-width:100%;min-width:0;container-type:inline-size}ha-card{padding:12px;width:100%;max-width:100%;min-width:0;overflow:hidden}.head{display:flex;align-items:center;gap:8px;margin-bottom:12px}.head h2{margin:0;flex:1}.tabs{display:flex;gap:6px}.tab.active{background:var(--primary-color);color:var(--text-primary-color);font-weight:700}
      .btn{border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);border-radius:10px;padding:8px 10px;cursor:pointer}.btn:disabled{opacity:.45;cursor:default}.primary{background:var(--primary-color);color:var(--text-primary-color);font-weight:700}
      .grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:10px}.person{border:1px solid var(--divider-color);border-radius:16px;padding:10px;min-width:0;background:var(--secondary-background-color)}
      .personHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.score{font-weight:800;white-space:nowrap}
      .goalWrap{margin:6px 0 10px}.goalMeta{display:flex;justify-content:space-between;gap:8px;font-size:.78rem;opacity:.78;margin-bottom:4px}.goalBar{height:9px;border-radius:999px;background:var(--divider-color);overflow:hidden}.goalFill{height:100%;background:var(--primary-color);border-radius:999px}
      .rewardList{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.rewardBtn{font-size:.78rem;padding:6px 8px}.fund{border:1px solid var(--divider-color);border-radius:16px;padding:10px 12px;margin-bottom:10px;background:var(--secondary-background-color)}.fundTop{display:flex;gap:10px;align-items:center}.fundTop strong{flex:1}.fundTitle{font-weight:800}.fundHistory{font-size:.78rem;opacity:.72;margin-top:7px}.task{border:1px solid var(--divider-color);border-radius:12px;padding:9px;margin:7px 0;background:var(--card-background-color)}
      .taskTop{display:flex;gap:8px;align-items:center}.taskTop strong{flex:1}.meta{font-size:.78rem;opacity:.68;margin-top:4px}.done{opacity:.55}.pending{border-style:dashed}.empty{opacity:.5;text-align:center;padding:18px 6px}
      @container (max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@container (max-width:560px){.grid{grid-template-columns:1fr}}
    </style><ha-card>
      <div class="head"><h2>🏠 Familien-Aufgaben</h2><div class="tabs"><button class="btn tab ${this.view==='today'?'active':''}" data-view="today">Heute</button><button class="btn tab ${this.view==='week'?'active':''}" data-view="week">Diese Woche</button><button class="btn tab ${this.view==='all'?'active':''}" data-view="all">Alle</button></div><button id="reload" class="btn">↻</button></div>
      ${this.fundHtml()}
      <div class="grid">${(this.data.members||[]).map(m=>this.personHtml(m)).join('')}</div>
    </ha-card>`;
    this.shadowRoot.querySelector('#reload').onclick=()=>this.load();
    this.shadowRoot.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{this.view=b.dataset.view;this.render();});
    this.shadowRoot.querySelectorAll('[data-complete]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const [task_id,member]=b.dataset.complete.split('|');const r=await this.ws('family_chores/complete',{task_id,member});if(r.status==='pending')alert('Erledigt gemeldet – wartet auf Bestätigung.');await this.load();}catch(e){alert(e.message||e);b.disabled=false;}});
    this.shadowRoot.querySelectorAll('[data-undo]').forEach(b=>b.onclick=async()=>{const [task_id,member]=b.dataset.undo.split('|');if(!confirm('Erledigung wirklich zurücknehmen?'))return;b.disabled=true;try{await this.ws('family_chores/undo_complete',{task_id,member});await this.load();}catch(e){alert(e.message||e);b.disabled=false;}});
    this.shadowRoot.querySelectorAll('[data-donate]').forEach(b=>b.onclick=async()=>{const member=b.dataset.donate;const score=Number(this.data.scores?.[member]||0);if(score<=0){alert('Keine Punkte zum Spenden vorhanden.');return;}const raw=prompt(`${member}: Wie viele Punkte möchtest du spenden?`,String(Math.min(5,score)));if(raw===null)return;const amount=Number(raw);if(!Number.isInteger(amount)||amount<=0){alert('Bitte eine ganze Punktzahl größer als 0 eingeben.');return;}if(amount>score){alert(`Es sind nur ${score} Punkte verfügbar.`);return;}const goal=this.data.active_savings_goal;if(!confirm(`${member}: ${amount} ⭐ ${goal?`für „${goal.title}“ `:''}an die Familienkasse spenden?`))return;try{await this.ws('family_chores/donate',{member,amount,goal_id:goal?.id||''});await this.load();}catch(e){alert(e.message||e);}});
    this.shadowRoot.querySelectorAll('[data-redeem]').forEach(b=>b.onclick=async()=>{const [reward_id,member]=b.dataset.redeem.split('|');const r=(this.data.rewards||[]).find(x=>x.id===reward_id);if(!r)return;if(!confirm(`${member}: „${r.title}“ für ${r.cost} Punkte einlösen?`))return;try{await this.ws('family_chores/redeem_reward',{reward_id,member});await this.load();}catch(e){alert(e.message||e);}});
  }
  fundHtml(){
    const balance=Number(this.data.family_fund_balance||0),g=this.data.active_savings_goal;
    const pct=g?Math.max(0,Math.min(100,Math.round((Number(g.current||0)/Math.max(1,Number(g.target||1)))*100))):0;
    const hist=(this.data.donation_history||[]).slice(-4).reverse();
    return `<div class="fund"><div class="fundTop"><span style="font-size:1.35rem">💰</span><div class="grow"><div class="fundTitle">Familienkasse · ${balance} ⭐</div>${g?`<div class="meta">${this.esc(g.icon||'🎯')} ${this.esc(g.title)} · ${Number(g.current||0)} / ${Number(g.target||0)} ⭐</div>`:'<div class="meta">Noch kein aktives Sparziel</div>'}</div>${g&&Number(g.current||0)>=Number(g.target||0)?'<strong>🎉 Ziel erreicht!</strong>':''}</div>${g?`<div class="goalBar" style="margin-top:8px"><div class="goalFill" style="width:${pct}%"></div></div>`:''}${hist.length?`<div class="fundHistory">${hist.map(h=>`${this.esc(h.member)} +${Number(h.family_points||Math.abs(h.points||0))}⭐`).join(' · ')}</div>`:''}</div>`;
  }
  personHtml(member){
    const tasks=this.memberTasks(member),score=Number(this.data.scores?.[member]||0);
    const weekly=Number(this.data.weekly_scores?.[member]||0),goal=Math.max(1,Number(this.data.weekly_goals?.[member]||25));
    const pct=Math.max(0,Math.min(100,Math.round((weekly/goal)*100)));
    const rewards=(this.data.rewards||[]);
    return `<div class="person"><div class="personHead"><strong>${this.esc(member)}</strong><span class="score">⭐ ${score}</span></div>
      <div class="goalWrap"><div class="goalMeta"><span>Wochenziel</span><strong>${weekly} / ${goal} ⭐</strong></div><div class="goalBar"><div class="goalFill" style="width:${pct}%"></div></div></div>
      <button class="btn rewardBtn" data-donate="${this.esc(member)}" ${score<=0?'disabled':''}>💰 Punkte spenden</button>
      ${tasks.length?tasks.map(t=>{const individual=t.completion_mode==='individual'&&(t.assignees_current||[]).length>1;const mineDone=individual?(t.completed_members||[]).includes(member):t.completed_today;const minePending=individual?(t.pending_members||[]).includes(member):t.pending_confirmation;const allView=this.view==='all';return `<div class="task ${mineDone?'done':''} ${minePending?'pending':''}">
        <div class="taskTop"><span>${this.esc(t.icon||'✅')}</span><strong>${this.esc(t.title)}</strong>
        ${allView?'':mineDone?`<button class="btn" data-undo="${this.esc(t.id)}|${this.esc(member)}" title="Erledigung zurücknehmen">↩ Zurück</button>`:minePending?`<button class="btn" data-undo="${this.esc(t.id)}|${this.esc(member)}" title="Meldung zurücknehmen">↩ Zurück</button>`:`<button class="btn primary" data-complete="${this.esc(t.id)}|${this.esc(member)}">Erledigt</button>`}</div>
        <div class="meta">${this.view==='week'?`${this.dayLabel(t.due_date)} · `:''}⭐ ${Number(t.points)||0}${t.due_time?` · ⏰ ${this.esc(t.due_time)}`:''}${t.requires_confirmation?' · Bestätigung':''}${individual?' · jeder einzeln':''}${allView?` · ${this.recurrenceLabel(t)}${t.active===false?' · inaktiv':''}`:''}</div></div>`}).join(''):`<div class="empty">${this.view==='today'?'Heute nichts offen 🎉':this.view==='week'?'Diese Woche nichts geplant':'Keine Aufgaben'}</div>`}
      ${rewards.length?`<div class="rewardList">${rewards.map(r=>`<button class="btn rewardBtn" data-redeem="${this.esc(r.id)}|${this.esc(member)}" ${score<Number(r.cost)?'disabled':''}>${this.esc(r.icon||'🎁')} ${this.esc(r.title)} · ${Number(r.cost)}⭐</button>`).join('')}</div>`:''}
    </div>`;
  }
}
if(!customElements.get('family-chores-card'))customElements.define('family-chores-card',FamilyChoresCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'family-chores-card',name:'Family Chores',description:'Familien-Aufgaben mit Punkten und Wochenzielen'});
