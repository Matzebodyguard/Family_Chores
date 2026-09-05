class FamilyChoresCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._hass=null;this.data={members:[],today_tasks:[],scores:{},weekly_scores:{},weekly_goals:{},rewards:[]};}
  setConfig(config){this.config=config||{};}
  set hass(h){const first=!this._hass;this._hass=h;if(first)this.load();}
  getCardSize(){return 6;}
  async ws(type,payload={}){return this._hass.callWS({type,...payload});}
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async load(){try{this.data=await this.ws('family_chores/get_data');this.render();}catch(e){this.shadowRoot.innerHTML=`<ha-card><div style="padding:16px">Family Chores: ${this.esc(e.message||e)}</div></ha-card>`;}}
  memberTasks(member){return (this.data.today_tasks||[]).filter(t=>(t.assignees_current||[]).includes(member));}
  render(){
    const cols=Math.max(1,(this.data.members||[]).length);
    this.shadowRoot.innerHTML=`<style>
      *{box-sizing:border-box}:host{display:block}ha-card{padding:12px}.head{display:flex;align-items:center;gap:8px;margin-bottom:12px}.head h2{margin:0;flex:1}
      .btn{border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);border-radius:10px;padding:8px 10px;cursor:pointer}.btn:disabled{opacity:.45;cursor:default}.primary{background:var(--primary-color);color:var(--text-primary-color);font-weight:700}
      .grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:10px}.person{border:1px solid var(--divider-color);border-radius:16px;padding:10px;min-width:0;background:var(--secondary-background-color)}
      .personHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.score{font-weight:800;white-space:nowrap}
      .goalWrap{margin:6px 0 10px}.goalMeta{display:flex;justify-content:space-between;gap:8px;font-size:.78rem;opacity:.78;margin-bottom:4px}.goalBar{height:9px;border-radius:999px;background:var(--divider-color);overflow:hidden}.goalFill{height:100%;background:var(--primary-color);border-radius:999px}
      .rewardList{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.rewardBtn{font-size:.78rem;padding:6px 8px}.task{border:1px solid var(--divider-color);border-radius:12px;padding:9px;margin:7px 0;background:var(--card-background-color)}
      .taskTop{display:flex;gap:8px;align-items:center}.taskTop strong{flex:1}.meta{font-size:.78rem;opacity:.68;margin-top:4px}.done{opacity:.55}.pending{border-style:dashed}.empty{opacity:.5;text-align:center;padding:18px 6px}
      @media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.grid{grid-template-columns:1fr}}
    </style><ha-card>
      <div class="head"><h2>🏠 Familien-Aufgaben</h2><button id="reload" class="btn">↻</button></div>
      <div class="grid">${(this.data.members||[]).map(m=>this.personHtml(m)).join('')}</div>
    </ha-card>`;
    this.shadowRoot.querySelector('#reload').onclick=()=>this.load();
    this.shadowRoot.querySelectorAll('[data-complete]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const [task_id,member]=b.dataset.complete.split('|');const r=await this.ws('family_chores/complete',{task_id,member});if(r.status==='pending')alert('Erledigt gemeldet – wartet auf Bestätigung.');await this.load();}catch(e){alert(e.message||e);b.disabled=false;}});
    this.shadowRoot.querySelectorAll('[data-redeem]').forEach(b=>b.onclick=async()=>{const [reward_id,member]=b.dataset.redeem.split('|');const r=(this.data.rewards||[]).find(x=>x.id===reward_id);if(!r)return;if(!confirm(`${member}: „${r.title}“ für ${r.cost} Punkte einlösen?`))return;try{await this.ws('family_chores/redeem_reward',{reward_id,member});await this.load();}catch(e){alert(e.message||e);}});
  }
  personHtml(member){
    const tasks=this.memberTasks(member),score=Number(this.data.scores?.[member]||0);
    const weekly=Number(this.data.weekly_scores?.[member]||0),goal=Math.max(1,Number(this.data.weekly_goals?.[member]||25));
    const pct=Math.max(0,Math.min(100,Math.round((weekly/goal)*100)));
    const rewards=(this.data.rewards||[]);
    return `<div class="person"><div class="personHead"><strong>${this.esc(member)}</strong><span class="score">⭐ ${score}</span></div>
      <div class="goalWrap"><div class="goalMeta"><span>Wochenziel</span><strong>${weekly} / ${goal} ⭐</strong></div><div class="goalBar"><div class="goalFill" style="width:${pct}%"></div></div></div>
      ${tasks.length?tasks.map(t=>`<div class="task ${t.completed_today?'done':''} ${t.pending_confirmation?'pending':''}">
        <div class="taskTop"><span>${this.esc(t.icon||'✅')}</span><strong>${this.esc(t.title)}</strong>
        ${t.completed_today?'<span>✅</span>':t.pending_confirmation?'<span>🟡</span>':`<button class="btn primary" data-complete="${this.esc(t.id)}|${this.esc(member)}">Erledigt</button>`}</div>
        <div class="meta">⭐ ${Number(t.points)||0}${t.due_time?` · ⏰ ${this.esc(t.due_time)}`:''}${t.requires_confirmation?' · Bestätigung':''}</div></div>`).join(''):'<div class="empty">Heute nichts offen 🎉</div>'}
      ${rewards.length?`<div class="rewardList">${rewards.map(r=>`<button class="btn rewardBtn" data-redeem="${this.esc(r.id)}|${this.esc(member)}" ${score<Number(r.cost)?'disabled':''}>${this.esc(r.icon||'🎁')} ${this.esc(r.title)} · ${Number(r.cost)}⭐</button>`).join('')}</div>`:''}
    </div>`;
  }
}
if(!customElements.get('family-chores-card'))customElements.define('family-chores-card',FamilyChoresCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'family-chores-card',name:'Family Chores',description:'Familien-Aufgaben mit Punkten und Wochenzielen'});
