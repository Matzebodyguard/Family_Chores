from __future__ import annotations
from pathlib import Path
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN, CONF_MEMBERS, STATIC_URL
from .manager import FamilyChoresManager

PLATFORMS=["sensor"]

async def async_setup(hass:HomeAssistant,config:dict)->bool:
    hass.data.setdefault(DOMAIN,{})
    await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL,str(Path(__file__).parent/"frontend"),False)])
    for cmd in (ws_get_data,ws_add_task,ws_update_task,ws_delete_task,ws_complete,ws_undo_complete,ws_confirm,ws_adjust_points,ws_set_weekly_goal,ws_add_reward,ws_update_reward,ws_delete_reward,ws_redeem_reward):
        websocket_api.async_register_command(hass,cmd)
    return True

async def async_setup_entry(hass:HomeAssistant,entry:ConfigEntry)->bool:
    manager=FamilyChoresManager(hass,entry.data.get(CONF_MEMBERS,[]))
    await manager.async_initialize()
    hass.data[DOMAIN][entry.entry_id]=manager
    await hass.config_entries.async_forward_entry_setups(entry,PLATFORMS)
    return True

async def async_unload_entry(hass:HomeAssistant,entry:ConfigEntry)->bool:
    ok=await hass.config_entries.async_unload_platforms(entry,PLATFORMS)
    if ok:hass.data[DOMAIN].pop(entry.entry_id,None)
    return ok

def _manager(hass):
    for item in hass.data.get(DOMAIN,{}).values():
        if isinstance(item,FamilyChoresManager):return item
    raise ValueError("Family Chores ist nicht geladen")

@websocket_api.websocket_command({vol.Required("type"):"family_chores/get_data"})
@websocket_api.async_response
async def ws_get_data(hass,connection,msg):
    try:connection.send_result(msg["id"],_manager(hass).export())
    except ValueError as e:connection.send_error(msg["id"],"not_loaded",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/add_task",vol.Required("task"):dict})
@websocket_api.async_response
async def ws_add_task(hass,connection,msg):
    try:connection.send_result(msg["id"],await _manager(hass).async_add_task(msg["task"]))
    except (ValueError,TypeError) as e:connection.send_error(msg["id"],"add_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/update_task",vol.Required("task_id"):str,vol.Required("task"):dict})
@websocket_api.async_response
async def ws_update_task(hass,connection,msg):
    try:connection.send_result(msg["id"],await _manager(hass).async_update_task(msg["task_id"],msg["task"]))
    except (ValueError,TypeError) as e:connection.send_error(msg["id"],"update_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/delete_task",vol.Required("task_id"):str})
@websocket_api.async_response
async def ws_delete_task(hass,connection,msg):
    try:
        await _manager(hass).async_delete_task(msg["task_id"]);connection.send_result(msg["id"],{"ok":True})
    except ValueError as e:connection.send_error(msg["id"],"delete_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/complete",vol.Required("task_id"):str,vol.Required("member"):str})
@websocket_api.async_response
async def ws_complete(hass,connection,msg):
    try:connection.send_result(msg["id"],await _manager(hass).async_complete(msg["task_id"],msg["member"]))
    except ValueError as e:connection.send_error(msg["id"],"complete_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/undo_complete",vol.Required("task_id"):str,vol.Required("member"):str})
@websocket_api.async_response
async def ws_undo_complete(hass,connection,msg):
    try:connection.send_result(msg["id"],await _manager(hass).async_undo_complete(msg["task_id"],msg["member"]))
    except ValueError as e:connection.send_error(msg["id"],"undo_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/confirm",vol.Required("history_id"):str,vol.Required("approved"):bool})
@websocket_api.async_response
async def ws_confirm(hass,connection,msg):
    try:
        await _manager(hass).async_confirm(msg["history_id"],msg["approved"]);connection.send_result(msg["id"],{"ok":True})
    except ValueError as e:connection.send_error(msg["id"],"confirm_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/adjust_points",vol.Required("member"):str,vol.Required("delta"):int,vol.Optional("reason",default=""):str})
@websocket_api.async_response
async def ws_adjust_points(hass,connection,msg):
    try:
        await _manager(hass).async_adjust_points(msg["member"],msg["delta"],msg["reason"]);connection.send_result(msg["id"],{"ok":True})
    except ValueError as e:connection.send_error(msg["id"],"points_failed",str(e))


@websocket_api.websocket_command({vol.Required("type"):"family_chores/set_weekly_goal",vol.Required("member"):str,vol.Required("goal"):int})
@websocket_api.async_response
async def ws_set_weekly_goal(hass,connection,msg):
    try:
        await _manager(hass).async_set_weekly_goal(msg["member"],msg["goal"]);connection.send_result(msg["id"],{"ok":True})
    except ValueError as e:connection.send_error(msg["id"],"goal_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/add_reward",vol.Required("reward"):dict})
@websocket_api.async_response
async def ws_add_reward(hass,connection,msg):
    try:connection.send_result(msg["id"],await _manager(hass).async_add_reward(msg["reward"]))
    except ValueError as e:connection.send_error(msg["id"],"reward_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/update_reward",vol.Required("reward_id"):str,vol.Required("reward"):dict})
@websocket_api.async_response
async def ws_update_reward(hass,connection,msg):
    try:connection.send_result(msg["id"],await _manager(hass).async_update_reward(msg["reward_id"],msg["reward"]))
    except ValueError as e:connection.send_error(msg["id"],"reward_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/delete_reward",vol.Required("reward_id"):str})
@websocket_api.async_response
async def ws_delete_reward(hass,connection,msg):
    try:
        await _manager(hass).async_delete_reward(msg["reward_id"]);connection.send_result(msg["id"],{"ok":True})
    except ValueError as e:connection.send_error(msg["id"],"reward_failed",str(e))

@websocket_api.websocket_command({vol.Required("type"):"family_chores/redeem_reward",vol.Required("reward_id"):str,vol.Required("member"):str})
@websocket_api.async_response
async def ws_redeem_reward(hass,connection,msg):
    try:
        await _manager(hass).async_redeem_reward(msg["reward_id"],msg["member"]);connection.send_result(msg["id"],{"ok":True})
    except ValueError as e:connection.send_error(msg["id"],"redeem_failed",str(e))
