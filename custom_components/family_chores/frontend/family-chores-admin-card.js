class FamilyChoresAdminCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._hass=null;this.data={members:[],today_tasks:[],tasks:[],scores:{},weekly_scores:{},weekly_goals:{},rewards:[],all_rewards:[],history:[]};}
  setConfig(config){this.config=config||{};}
  set hass(h){const first=!this._hass;this._hass=h;if(first)this.load();}
  getCardSize(){return 6;}
  async ws(type,payload={}){return this._hass.callWS({type,...payload});}
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async load(){try{this.data=await this.ws('family_chores/get_data');this.render();}catch(e){this.shadowRoot.innerHTML=`<ha-card><div style="padding:16px">Family Chores: ${this.esc(e.message||e)}</div></ha-card>`;}}
  memberTasks(member){return (this.data.today_tasks||[]).filter(t=>(t.assignees_current||[]).includes(member));}
  recurrenceLabel(t){const m={once:'Einmalig',daily:'Täglich',weekdays:'Wochentage',weekly:'Wöchentlich',every_n_weeks:`Alle ${t.interval_weeks||2} Wochen`,monthly:'Monatlich'};return m[t.recurrence]||t.recurrence;}
  render(){
    this.shadowRoot.innerHTML=`<style>
      *{box-sizing:border-box}:host{display:block}ha-card{padding:12px}.head{display:flex;align-items:center;gap:8px;margin-bottom:12px}.head h2,.head h3{margin:0;flex:1}
      .btn{border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);border-radius:10px;padding:8px 10px;cursor:pointer}.primary{background:var(--primary-color);color:var(--text-primary-color);font-weight:700}
      .adminList{display:grid;gap:8px}.adminTask{display:flex;gap:8px;align-items:center;border:1px solid var(--divider-color);border-radius:12px;padding:9px}.grow{flex:1}.meta{font-size:.78rem;opacity:.68;margin-top:4px}.empty{opacity:.5;text-align:center;padding:18px 6px}
      .pendingBox,.goals,.rewardsAdmin{margin-top:16px}.goalRow,.rewardRow{display:flex;gap:8px;align-items:center;border:1px solid var(--divider-color);border-radius:12px;padding:9px;margin:7px 0}.goalRow input{width:90px;padding:7px;border-radius:8px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}.pendingRow{display:flex;gap:8px;align-items:center;border:1px dashed var(--warning-color,var(--divider-color));padding:9px;border-radius:12px;margin:7px 0}
      dialog{border:0;border-radius:18px;padding:0;background:var(--card-background-color);color:var(--primary-text-color);width:min(620px,94vw);max-height:90vh}.modal{padding:18px;overflow:auto;max-height:90vh}
      .field{display:grid;gap:5px;margin:10px 0}.field input,.field select{width:100%;padding:9px;border:1px solid var(--divider-color);border-radius:9px;background:var(--card-background-color);color:var(--primary-text-color)}
      .checks{display:flex;gap:10px;flex-wrap:wrap}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      @media(max-width:650px){.adminTask,.goalRow,.rewardRow,.pendingRow{align-items:stretch;flex-wrap:wrap}.adminTask .grow,.goalRow .grow,.rewardRow .grow,.pendingRow .grow{flex-basis:100%}}
    </style><ha-card>
      <div class="head"><h2>🔧 Familien-Aufgaben · Verwaltung</h2><button id="reload" class="btn">↻</button></div>
      ${this.adminHtml()}
      <dialog id="taskDialog"><div class="modal" id="taskModal"></div></dialog>
      <dialog id="pointsDialog"><div class="modal" id="pointsModal"></div></dialog>
      <dialog id="rewardDialog"><div class="modal" id="rewardModal"></div></dialog>
    </ha-card>`;
    this.shadowRoot.querySelector('#reload').onclick=()=>this.load();
    this.bindAdmin();
  }
  adminHtml(){
    const pending=(this.data.history||[]).filter(h=>h.status==='pending');
    return `<div class="adminPanel"><div class="head"><h3 style="margin:0">Aufgaben</h3><button id="addTask" class="btn primary">＋ Aufgabe</button><button id="adjustPoints" class="btn">⭐ Punkte</button><button id="addReward" class="btn">🎁 Belohnung</button></div>
      <div class="adminList">${(this.data.tasks||[]).map(t=>`<div class="adminTask"><span>${this.esc(t.icon||'✅')}</span><div class="grow"><strong>${this.esc(t.title)}</strong><div class="meta">${this.esc(this.recurrenceLabel(t))} · ⭐ ${Number(t.points)||0} · ${(t.rotation?.length?`Rotation: ${t.rotation.join(' → ')}`:(t.assignees||[]).join(', '))}</div></div><button class="btn" data-edit="${t.id}">Bearbeiten</button><button class="btn" data-del="${t.id}">🗑️</button></div>`).join('')}</div>
      <div class="goals"><h3>🎯 Wochenziele</h3>${(this.data.members||[]).map(m=>`<div class="goalRow"><div class="grow"><strong>${this.esc(m)}</strong><div class="meta">Punkte, die in einer Woche erreicht werden sollen</div></div><input type="number" min="1" max="999" data-goal="${this.esc(m)}" value="${Number(this.data.weekly_goals?.[m]||25)}"><button class="btn" data-save-goal="${this.esc(m)}">Speichern</button></div>`).join('')}</div>
      <div class="rewardsAdmin"><h3>🎁 Belohnungen</h3>${(this.data.all_rewards||[]).length?(this.data.all_rewards||[]).map(r=>`<div class="rewardRow"><span>${this.esc(r.icon||'🎁')}</span><div class="grow"><strong>${this.esc(r.title)}</strong><div class="meta">${Number(r.cost)} Punkte · ${r.active===false?'inaktiv':'aktiv'}</div></div><button class="btn" data-edit-reward="${r.id}">Bearbeiten</button><button class="btn" data-del-reward="${r.id}">🗑️</button></div>`).join(''):'<div class="empty">Noch keine Belohnungen angelegt.</div>'}</div>
      ${pending.length?`<div class="pendingBox"><h3>Wartet auf Bestätigung</h3>${pending.map(h=>`<div class="pendingRow"><div class="grow"><strong>${this.esc(h.member)}: ${this.esc(h.title)}</strong><div class="meta">⭐ ${h.points}</div></div><button class="btn primary" data-confirm="${h.id}">Bestätigen</button><button class="btn" data-reject="${h.id}">Zurückgeben</button></div>`).join('')}</div>`:''}
    </div>`;
  }
  bindAdmin(){
    this.shadowRoot.querySelector('#addTask').onclick=()=>this.openTask();
    this.shadowRoot.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.openTask((this.data.tasks||[]).find(t=>t.id===b.dataset.edit)));
    this.shadowRoot.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const t=(this.data.tasks||[]).find(x=>x.id===b.dataset.del);if(confirm(`„${t?.title||'Aufgabe'}“ wirklich endgültig löschen?`)){await this.ws('family_chores/delete_task',{task_id:b.dataset.del});await this.load();}});
    this.shadowRoot.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=async()=>{await this.ws('family_chores/confirm',{history_id:b.dataset.confirm,approved:true});await this.load();});
    this.shadowRoot.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{await this.ws('family_chores/confirm',{history_id:b.dataset.reject,approved:false});await this.load();});
    this.shadowRoot.querySelector('#adjustPoints').onclick=()=>this.openPoints();
    this.shadowRoot.querySelector('#addReward').onclick=()=>this.openReward();
    this.shadowRoot.querySelectorAll('[data-save-goal]').forEach(b=>b.onclick=async()=>{const m=b.dataset.saveGoal;const input=this.shadowRoot.querySelector(`[data-goal="${CSS.escape(m)}"]`);await this.ws('family_chores/set_weekly_goal',{member:m,goal:Number(input.value||25)});await this.load();});
    this.shadowRoot.querySelectorAll('[data-edit-reward]').forEach(b=>b.onclick=()=>this.openReward((this.data.all_rewards||[]).find(r=>r.id===b.dataset.editReward)));
    this.shadowRoot.querySelectorAll('[data-del-reward]').forEach(b=>b.onclick=async()=>{const r=(this.data.all_rewards||[]).find(x=>x.id===b.dataset.delReward);if(confirm(`Belohnung „${r?.title||''}“ wirklich löschen?`)){await this.ws('family_chores/delete_reward',{reward_id:b.dataset.delReward});await this.load();}});
  }
  openTask(task=null){
    const d=this.shadowRoot.querySelector('#taskDialog'),m=this.shadowRoot.querySelector('#taskModal'),members=this.data.members||[];
    const t=task||{title:'',icon:'✅',points:2,assignees:[members[0]].filter(Boolean),rotation:[],recurrence:'daily',weekdays:[],interval_weeks:2,month_day:new Date().getDate(),start_date:this.data.today,due_time:'',requires_confirmation:false,active:true};
    m.innerHTML=`<h2>${task?'Aufgabe bearbeiten':'Neue Aufgabe'}</h2>
      <div class="field"><label>Titel</label><input id="title" value="${this.esc(t.title)}"></div>
      <div class="field"><label>Icon / Emoji</label><input id="icon" value="${this.esc(t.icon||'✅')}"></div>
      <div class="field"><label>Punkte</label><input id="points" type="number" min="0" max="100" value="${Number(t.points)||0}"></div>
      <div class="field"><label>Zuständig</label><div class="checks">${members.map(x=>`<label><input type="checkbox" data-assignee="${this.esc(x)}" ${(t.assignees||[]).includes(x)?'checked':''}> ${this.esc(x)}</label>`).join('')}</div></div>
      <div class="field"><label>Rotation (optional, Reihenfolge)</label><input id="rotation" value="${this.esc((t.rotation||[]).join(', '))}" placeholder="${this.esc(members.join(', '))}"></div>
      <div class="field"><label>Wiederholung</label><select id="recurrence">${[['once','Einmalig'],['daily','Täglich'],['weekdays','Bestimmte Wochentage'],['weekly','Wöchentlich'],['every_n_weeks','Alle X Wochen'],['monthly','Monatlich']].map(([v,l])=>`<option value="${v}" ${t.recurrence===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Wochentage</label><div class="checks">${['Mo','Di','Mi','Do','Fr','Sa','So'].map((x,i)=>`<label><input type="checkbox" data-weekday="${i}" ${(t.weekdays||[]).includes(i)?'checked':''}> ${x}</label>`).join('')}</div></div>
      <div class="field"><label>Intervall Wochen</label><input id="interval" type="number" min="1" max="12" value="${Number(t.interval_weeks)||2}"></div>
      <div class="field"><label>Monatstag (1–28)</label><input id="monthday" type="number" min="1" max="28" value="${Number(t.month_day)||1}"></div>
      <div class="field"><label>Startdatum</label><input id="start" type="date" value="${this.esc(t.start_date||this.data.today)}"></div>
      <div class="field"><label>Uhrzeit (optional)</label><input id="time" type="time" value="${this.esc(t.due_time||'')}"></div>
      <div class="checks"><label><input id="confirm" type="checkbox" ${t.requires_confirmation?'checked':''}> Bestätigung erforderlich</label><label><input id="active" type="checkbox" ${t.active!==false?'checked':''}> Aktiv</label></div>
      <div class="actions"><button id="cancel" class="btn">Abbrechen</button><button id="save" class="btn primary">Speichern</button></div>`;
    m.querySelector('#cancel').onclick=()=>d.close();
    m.querySelector('#save').onclick=async()=>{
      const assignees=[...m.querySelectorAll('[data-assignee]:checked')].map(x=>x.dataset.assignee);
      const rotation=m.querySelector('#rotation').value.split(',').map(x=>x.trim()).filter(x=>members.includes(x));
      const weekdays=[...m.querySelectorAll('[data-weekday]:checked')].map(x=>Number(x.dataset.weekday));
      const payload={title:m.querySelector('#title').value.trim(),icon:m.querySelector('#icon').value.trim(),points:Number(m.querySelector('#points').value||0),assignees,rotation,recurrence:m.querySelector('#recurrence').value,weekdays,interval_weeks:Number(m.querySelector('#interval').value||2),month_day:Number(m.querySelector('#monthday').value||1),start_date:m.querySelector('#start').value,due_time:m.querySelector('#time').value,requires_confirmation:m.querySelector('#confirm').checked,active:m.querySelector('#active').checked};
      if(!payload.title){alert('Bitte einen Titel eingeben.');return;}
      try{if(task)await this.ws('family_chores/update_task',{task_id:task.id,task:payload});else await this.ws('family_chores/add_task',{task:payload});d.close();await this.load();}catch(e){alert(e.message||e);}
    };
    d.showModal();
  }
  openReward(reward=null){
    const d=this.shadowRoot.querySelector('#rewardDialog'),m=this.shadowRoot.querySelector('#rewardModal');
    const r=reward||{title:'',icon:'🎁',cost:25,active:true};
    m.innerHTML=`<h2>${reward?'Belohnung bearbeiten':'Neue Belohnung'}</h2>
      <div class="field"><label>Titel</label><input id="rewardTitle" value="${this.esc(r.title)}" placeholder="z. B. Film aussuchen"></div>
      <div class="field"><label>Icon / Emoji</label><input id="rewardIcon" value="${this.esc(r.icon||'🎁')}"></div>
      <div class="field"><label>Kosten in Punkten</label><input id="rewardCost" type="number" min="1" max="9999" value="${Number(r.cost)||25}"></div>
      <div class="checks"><label><input id="rewardActive" type="checkbox" ${r.active!==false?'checked':''}> Aktiv</label></div>
      <div class="actions"><button id="rewardCancel" class="btn">Abbrechen</button><button id="rewardSave" class="btn primary">Speichern</button></div>`;
    m.querySelector('#rewardCancel').onclick=()=>d.close();
    m.querySelector('#rewardSave').onclick=async()=>{const payload={title:m.querySelector('#rewardTitle').value.trim(),icon:m.querySelector('#rewardIcon').value.trim(),cost:Number(m.querySelector('#rewardCost').value||1),active:m.querySelector('#rewardActive').checked};if(!payload.title){alert('Bitte einen Titel eingeben.');return;}try{if(reward)await this.ws('family_chores/update_reward',{reward_id:reward.id,reward:payload});else await this.ws('family_chores/add_reward',{reward:payload});d.close();await this.load();}catch(e){alert(e.message||e);}};
    d.showModal();
  }

  openPoints(){
    const d=this.shadowRoot.querySelector('#pointsDialog'),m=this.shadowRoot.querySelector('#pointsModal');
    m.innerHTML=`<h2>⭐ Punkte anpassen</h2><div class="field"><label>Person</label><select id="member">${(this.data.members||[]).map(x=>`<option>${this.esc(x)}</option>`).join('')}</select></div><div class="field"><label>Änderung</label><input id="delta" type="number" value="1"></div><div class="field"><label>Grund</label><input id="reason" placeholder="z. B. Extra-Hilfe"></div><div class="actions"><button id="cancel" class="btn">Abbrechen</button><button id="save" class="btn primary">Übernehmen</button></div>`;
    m.querySelector('#cancel').onclick=()=>d.close();
    m.querySelector('#save').onclick=async()=>{await this.ws('family_chores/adjust_points',{member:m.querySelector('#member').value,delta:Number(m.querySelector('#delta').value||0),reason:m.querySelector('#reason').value});d.close();await this.load();};
    d.showModal();
  }
}
if(!customElements.get('family-chores-admin-card'))customElements.define('family-chores-admin-card',FamilyChoresAdminCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'family-chores-admin-card',name:'Family Chores Verwaltung',description:'Verwaltung für Family Chores'});
