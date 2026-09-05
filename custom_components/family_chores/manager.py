from __future__ import annotations
from datetime import datetime, date
import uuid
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from .const import STORE_KEY, STORE_VERSION

class FamilyChoresManager:
    def __init__(self,hass:HomeAssistant,members:list[str]):
        self.hass=hass; self.members=members
        self.store=Store(hass,STORE_VERSION,STORE_KEY)
        self.state={"tasks":[],"history":[],"scores":{},"weekly_goals":{},"rewards":[],"family_fund_balance":0,"savings_goals":[]}

    async def async_initialize(self):
        stored=await self.store.async_load()
        if stored:self.state.update(stored)
        self.state.setdefault("tasks",[]);self.state.setdefault("history",[]);self.state.setdefault("scores",{});self.state.setdefault("weekly_goals",{});self.state.setdefault("rewards",[]);self.state.setdefault("family_fund_balance",0);self.state.setdefault("savings_goals",[])
        for m in self.members:self.state["scores"].setdefault(m,0);self.state["weekly_goals"].setdefault(m,25)
        await self._save()

    async def _save(self): await self.store.async_save(self.state)
    @staticmethod
    def _today(): return datetime.now().astimezone().date()
    @staticmethod
    def _parse_date(v):
        try:return date.fromisoformat(v) if v else None
        except ValueError:return None

    def _is_due_on(self,t,day):
        if not t.get("active",True):return False
        start=self._parse_date(t.get("start_date")) or day
        if day<start:return False
        r=t.get("recurrence","once")
        if r=="once":return day==start and not t.get("completed_once",False)
        if r=="daily":return True
        wd=set(int(x) for x in t.get("weekdays",[]))
        if r in ("weekdays","weekly"):return day.weekday() in (wd or {start.weekday()})
        if r=="every_n_weeks":
            if day.weekday() not in (wd or {start.weekday()}):return False
            weeks=max(1,int(t.get("interval_weeks",2)))
            return ((day-start).days//7)%weeks==0
        if r=="monthly":return day.day==max(1,min(28,int(t.get("month_day",start.day))))
        return False

    def _completed(self,task_id,day,member=None):
        ds=day.isoformat()
        return any(
            h.get("task_id")==task_id and h.get("due_date")==ds and h.get("status")=="completed"
            and (member is None or h.get("member")==member)
            for h in self.state["history"]
        )

    def _pending(self,task_id,day,member=None):
        ds=day.isoformat()
        for h in reversed(self.state["history"]):
            if (h.get("task_id")==task_id and h.get("due_date")==ds and h.get("status")=="pending"
                    and (member is None or h.get("member")==member)):
                return h
        return None

    def _occurrence(self,t,day):
        assignees=self._current_assignees(t)
        mode=t.get("completion_mode","shared")
        if mode=="individual" and len(assignees)>1:
            completed_members=[m for m in assignees if self._completed(t["id"],day,m)]
            pending_members=[m for m in assignees if self._pending(t["id"],day,m)]
            completed=len(completed_members)==len(assignees)
            pending=bool(pending_members) and not completed
        else:
            completed_members=assignees if self._completed(t["id"],day) else []
            pending_members=assignees if self._pending(t["id"],day) else []
            completed=bool(completed_members)
            pending=bool(pending_members)
        return {**t,"assignees_current":assignees,"completed_today":completed,
                "pending_confirmation":pending,"completed_members":completed_members,
                "pending_members":pending_members,"due_date":day.isoformat()}

    def _current_assignees(self,t):
        rot=[x for x in t.get("rotation",[]) if x in self.members]
        if rot:return [rot[int(t.get("rotation_index",0))%len(rot)]]
        a=[x for x in t.get("assignees",[]) if x in self.members]
        return a or ([self.members[0]] if self.members else [])

    def export(self):
        today=self._today(); tt=[]; week_tasks=[]
        monday=today.fromordinal(today.toordinal()-today.weekday())
        sunday=monday.fromordinal(monday.toordinal()+6)
        for t in self.state["tasks"]:
            if self._is_due_on(t,today):
                tt.append(self._occurrence(t,today))
            for offset in range(7):
                day=monday.fromordinal(monday.toordinal()+offset)
                if self._is_due_on(t,day):
                    week_tasks.append(self._occurrence(t,day))
        weekly={m:0 for m in self.members}
        for h in self.state["history"]:
            if h.get("member") not in weekly:continue
            hd=self._parse_date(h.get("due_date"))
            if not hd or hd<monday or hd>today:continue
            if h.get("status") in ("completed","adjustment"):
                weekly[h["member"]]+=int(h.get("points",0))
        return {
            "members":self.members,
            "tasks":self.state["tasks"],
            "today_tasks":tt,
            "week_tasks":week_tasks,
            "scores":{m:int(self.state["scores"].get(m,0)) for m in self.members},
            "weekly_scores":weekly,
            "weekly_goals":{m:max(1,int(self.state["weekly_goals"].get(m,25))) for m in self.members},
            "rewards":[r for r in self.state["rewards"] if r.get("active",True)],
            "all_rewards":self.state["rewards"],
            "family_fund_balance":int(self.state.get("family_fund_balance",0)),
            "savings_goals":self.state.get("savings_goals",[]),
            "active_savings_goal":next((g for g in self.state.get("savings_goals",[]) if g.get("active",False) and not g.get("completed",False)),None),
            "donation_history":[h for h in self.state["history"] if h.get("status")=="donation"][-100:],
            "history":self.state["history"][-200:],
            "today":today.isoformat(),
            "week_start":monday.isoformat(),
        }

    async def async_add_task(self,data):
        title=str(data.get("title","")).strip()
        if not title:raise ValueError("Titel fehlt")
        t={"id":uuid.uuid4().hex[:12],"title":title,"icon":str(data.get("icon","✅")).strip() or "✅",
           "assignees":[x for x in data.get("assignees",[]) if x in self.members],
           "rotation":[x for x in data.get("rotation",[]) if x in self.members],"rotation_index":0,
           "points":max(0,int(data.get("points",1))),"requires_confirmation":bool(data.get("requires_confirmation",False)),
           "completion_mode":"individual" if data.get("completion_mode")=="individual" else "shared",
           "recurrence":data.get("recurrence","once"),"weekdays":[int(x) for x in data.get("weekdays",[])],
           "interval_weeks":max(1,int(data.get("interval_weeks",2))),"month_day":max(1,min(28,int(data.get("month_day",self._today().day)))),
           "start_date":data.get("start_date") or self._today().isoformat(),"due_time":str(data.get("due_time","")).strip(),
           "active":True,"completed_once":False}
        self.state["tasks"].append(t);await self._save();return t

    async def async_update_task(self,task_id,data):
        t=next((x for x in self.state["tasks"] if x["id"]==task_id),None)
        if not t:raise ValueError("Aufgabe nicht gefunden")
        allowed={"title","icon","assignees","rotation","points","requires_confirmation","completion_mode","recurrence","weekdays","interval_weeks","month_day","start_date","due_time","active"}
        for k in allowed:
            if k in data:t[k]=data[k]
        t["points"]=max(0,int(t.get("points",0)));t["weekdays"]=[int(x) for x in t.get("weekdays",[])]
        t["interval_weeks"]=max(1,int(t.get("interval_weeks",2)));t["month_day"]=max(1,min(28,int(t.get("month_day",1))))
        t["assignees"]=[x for x in t.get("assignees",[]) if x in self.members];t["rotation"]=[x for x in t.get("rotation",[]) if x in self.members]
        t["completion_mode"]="individual" if t.get("completion_mode")=="individual" else "shared"
        await self._save();return t

    async def async_delete_task(self,task_id):
        n=len(self.state["tasks"]);self.state["tasks"]=[x for x in self.state["tasks"] if x["id"]!=task_id]
        if len(self.state["tasks"])==n:raise ValueError("Aufgabe nicht gefunden")
        await self._save()

    def _award(self,t,member):
        self.state["scores"][member]=int(self.state["scores"].get(member,0))+int(t.get("points",0))

    def _finish_occurrence(self,t,day):
        assignees=self._current_assignees(t)
        individual=t.get("completion_mode")=="individual" and len(assignees)>1
        finished=all(self._completed(t["id"],day,m) for m in assignees) if individual else self._completed(t["id"],day)
        if not finished:return
        if t.get("recurrence")=="once":t["completed_once"]=True
        rot=[x for x in t.get("rotation",[]) if x in self.members]
        if rot:t["rotation_index"]=(int(t.get("rotation_index",0))+1)%len(rot)

    async def async_complete(self,task_id,member):
        t=next((x for x in self.state["tasks"] if x["id"]==task_id),None)
        if not t:raise ValueError("Aufgabe nicht gefunden")
        today=self._today()
        assignees=self._current_assignees(t)
        if member not in assignees:raise ValueError("Diese Aufgabe ist aktuell nicht dieser Person zugewiesen")
        individual=t.get("completion_mode")=="individual" and len(assignees)>1
        if self._completed(task_id,today,member if individual else None):return {"status":"already_completed"}
        self.state["history"]=[h for h in self.state["history"] if not(h.get("task_id")==task_id and h.get("due_date")==today.isoformat() and h.get("status")=="pending" and (not individual or h.get("member")==member))]
        status="pending" if t.get("requires_confirmation") else "completed"
        rec={"id":uuid.uuid4().hex[:12],"task_id":task_id,"title":t["title"],"member":member,"points":int(t.get("points",0)),"due_date":today.isoformat(),"completed_at":datetime.now().astimezone().isoformat(timespec="seconds"),"status":status}
        self.state["history"].append(rec)
        if status=="completed":
            self._award(t,member)
            self._finish_occurrence(t,today)
        await self._save();return {"status":status}

    async def async_undo_complete(self,task_id,member):
        t=next((x for x in self.state["tasks"] if x["id"]==task_id),None)
        if not t:raise ValueError("Aufgabe nicht gefunden")
        today=self._today(); assignees=self._current_assignees(t)
        if member not in assignees:raise ValueError("Diese Aufgabe ist aktuell nicht dieser Person zugewiesen")
        individual=t.get("completion_mode")=="individual" and len(assignees)>1

        candidates=[h for h in self.state["history"]
                    if h.get("task_id")==task_id and h.get("due_date")==today.isoformat()
                    and h.get("status") in ("completed","pending")
                    and (not individual or h.get("member")==member)]
        if not candidates:return {"status":"not_completed"}
        rec=candidates[-1]

        # If points were already credited, remove exactly those points again.
        if rec.get("status")=="completed":
            who=rec.get("member")
            if who in self.members:
                self.state["scores"][who]=int(self.state["scores"].get(who,0))-int(rec.get("points",0))

        self.state["history"].remove(rec)

        # Re-open a one-off task.
        if t.get("recurrence")=="once":
            t["completed_once"]=False

        # Rotation advances only once the occurrence is fully completed. If this
        # undo re-opens a rotated occurrence, move the rotation one step back.
        rot=[x for x in t.get("rotation",[]) if x in self.members]
        if rot and rec.get("status")=="completed":
            # After completion the current assignee is already the next one.
            # Only rewind when the removed record belonged to the previous slot.
            prev=(int(t.get("rotation_index",0))-1)%len(rot)
            if rec.get("member")==rot[prev]:
                t["rotation_index"]=prev

        await self._save()
        return {"status":"undone"}

    async def async_confirm(self,history_id,approved):
        rec=next((x for x in self.state["history"] if x["id"]==history_id),None)
        if not rec or rec.get("status")!="pending":raise ValueError("Keine offene Bestätigung gefunden")
        if not approved:
            rec["status"]="rejected";await self._save();return
        t=next((x for x in self.state["tasks"] if x["id"]==rec["task_id"]),None)
        if not t:raise ValueError("Aufgabe nicht gefunden")
        rec["status"]="completed";rec["confirmed_at"]=datetime.now().astimezone().isoformat(timespec="seconds")
        self._award(t,rec["member"])
        due=self._parse_date(rec.get("due_date")) or self._today()
        self._finish_occurrence(t,due);await self._save()

    async def async_adjust_points(self,member,delta,reason=""):
        if member not in self.members:raise ValueError("Unbekannte Person")
        self.state["scores"][member]=int(self.state["scores"].get(member,0))+int(delta)
        self.state["history"].append({"id":uuid.uuid4().hex[:12],"task_id":"","title":reason or "Punkteanpassung","member":member,"points":int(delta),"due_date":self._today().isoformat(),"completed_at":datetime.now().astimezone().isoformat(timespec="seconds"),"status":"adjustment"})
        await self._save()

    async def async_set_weekly_goal(self,member,goal):
        if member not in self.members:raise ValueError("Unbekannte Person")
        self.state["weekly_goals"][member]=max(1,int(goal))
        await self._save()

    async def async_add_savings_goal(self,data):
        title=str(data.get("title","")).strip()
        if not title:raise ValueError("Sparziel braucht einen Titel")
        goal={"id":uuid.uuid4().hex[:12],"title":title,
              "icon":str(data.get("icon","🎯")).strip() or "🎯",
              "target":max(1,int(data.get("target",100))),
              "current":max(0,int(data.get("current",0))),
              "active":bool(data.get("active",False)),
              "completed":bool(data.get("completed",False))}
        if goal["active"]:
            for g in self.state["savings_goals"]:g["active"]=False
        self.state["savings_goals"].append(goal)
        await self._save();return goal

    async def async_update_savings_goal(self,goal_id,data):
        g=next((x for x in self.state["savings_goals"] if x["id"]==goal_id),None)
        if not g:raise ValueError("Sparziel nicht gefunden")
        for k in ("title","icon","target","active","completed"):
            if k in data:g[k]=data[k]
        g["title"]=str(g.get("title","")).strip()
        if not g["title"]:raise ValueError("Sparziel braucht einen Titel")
        g["icon"]=str(g.get("icon","🎯")).strip() or "🎯"
        g["target"]=max(1,int(g.get("target",100)))
        g["active"]=bool(g.get("active",False))
        g["completed"]=bool(g.get("completed",False))
        if g["active"]:
            g["completed"]=False
            for other in self.state["savings_goals"]:
                if other["id"]!=goal_id:other["active"]=False
        if g["completed"]:g["active"]=False
        await self._save();return g

    async def async_delete_savings_goal(self,goal_id):
        n=len(self.state["savings_goals"])
        self.state["savings_goals"]=[x for x in self.state["savings_goals"] if x["id"]!=goal_id]
        if len(self.state["savings_goals"])==n:raise ValueError("Sparziel nicht gefunden")
        await self._save()

    async def async_donate(self,member,amount,goal_id=""):
        if member not in self.members:raise ValueError("Unbekannte Person")
        amount=int(amount)
        if amount<=0:raise ValueError("Spende muss größer als 0 sein")
        balance=int(self.state["scores"].get(member,0))
        if balance<amount:raise ValueError(f"Es fehlen noch {amount-balance} Punkte")
        goal=None
        if goal_id:
            goal=next((x for x in self.state["savings_goals"] if x["id"]==goal_id),None)
            if not goal:raise ValueError("Sparziel nicht gefunden")
        else:
            goal=next((x for x in self.state["savings_goals"] if x.get("active",False) and not x.get("completed",False)),None)
        self.state["scores"][member]=balance-amount
        self.state["family_fund_balance"]=int(self.state.get("family_fund_balance",0))+amount
        if goal:
            goal["current"]=int(goal.get("current",0))+amount
        self.state["history"].append({
            "id":uuid.uuid4().hex[:12],"task_id":"",
            "title":f"Spende: {goal['title']}" if goal else "Spende an Familienkasse",
            "member":member,"points":-amount,"family_points":amount,
            "goal_id":goal["id"] if goal else "",
            "due_date":self._today().isoformat(),
            "completed_at":datetime.now().astimezone().isoformat(timespec="seconds"),
            "status":"donation"
        })
        await self._save()
        return {"ok":True,"family_fund_balance":self.state["family_fund_balance"]}

    async def async_add_reward(self,data):
        title=str(data.get("title","")).strip()
        if not title:raise ValueError("Belohnung braucht einen Titel")
        reward={"id":uuid.uuid4().hex[:12],"title":title,"icon":str(data.get("icon","🎁")).strip() or "🎁","cost":max(1,int(data.get("cost",10))),"active":bool(data.get("active",True))}
        self.state["rewards"].append(reward);await self._save();return reward

    async def async_update_reward(self,reward_id,data):
        r=next((x for x in self.state["rewards"] if x["id"]==reward_id),None)
        if not r:raise ValueError("Belohnung nicht gefunden")
        for k in ("title","icon","cost","active"):
            if k in data:r[k]=data[k]
        r["title"]=str(r.get("title","")).strip()
        if not r["title"]:raise ValueError("Belohnung braucht einen Titel")
        r["cost"]=max(1,int(r.get("cost",1)))
        r["active"]=bool(r.get("active",True))
        await self._save();return r

    async def async_delete_reward(self,reward_id):
        n=len(self.state["rewards"]);self.state["rewards"]=[x for x in self.state["rewards"] if x["id"]!=reward_id]
        if len(self.state["rewards"])==n:raise ValueError("Belohnung nicht gefunden")
        await self._save()

    async def async_redeem_reward(self,reward_id,member):
        if member not in self.members:raise ValueError("Unbekannte Person")
        r=next((x for x in self.state["rewards"] if x["id"]==reward_id and x.get("active",True)),None)
        if not r:raise ValueError("Belohnung nicht gefunden")
        cost=int(r.get("cost",0));balance=int(self.state["scores"].get(member,0))
        if balance<cost:raise ValueError(f"Es fehlen noch {cost-balance} Punkte")
        self.state["scores"][member]=balance-cost
        self.state["history"].append({"id":uuid.uuid4().hex[:12],"task_id":"","title":f"Belohnung: {r['title']}","member":member,"points":-cost,"due_date":self._today().isoformat(),"completed_at":datetime.now().astimezone().isoformat(timespec="seconds"),"status":"reward"})
        await self._save()
