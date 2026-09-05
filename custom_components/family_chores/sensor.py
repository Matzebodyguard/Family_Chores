from __future__ import annotations
from datetime import timedelta
import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from .const import DOMAIN
_LOGGER=logging.getLogger(__name__)

async def async_setup_entry(hass,entry,async_add_entities):
    manager=hass.data[DOMAIN][entry.entry_id]
    async def update():return manager.export()
    coord=DataUpdateCoordinator(hass,_LOGGER,name="family_chores",update_method=update,update_interval=timedelta(minutes=5))
    await coord.async_config_entry_first_refresh()
    ents=[]
    for m in manager.members:
        ents += [PointsSensor(coord,m),OpenSensor(coord,m)]
    async_add_entities(ents)

class Base(SensorEntity):
    _attr_has_entity_name=True
    def __init__(self,coord,member):self.coordinator=coord;self.member=member
    async def async_added_to_hass(self):self.async_on_remove(self.coordinator.async_add_listener(self.async_write_ha_state))
    @property
    def available(self):return self.coordinator.last_update_success

class PointsSensor(Base):
    _attr_native_unit_of_measurement="Punkte";_attr_icon="mdi:star-circle"
    @property
    def name(self):return f"{self.member} Punkte"
    @property
    def unique_id(self):return f"family_chores_{self.member.lower()}_points"
    @property
    def native_value(self):return int(self.coordinator.data["scores"].get(self.member,0))

class OpenSensor(Base):
    _attr_native_unit_of_measurement="Aufgaben";_attr_icon="mdi:clipboard-check-outline"
    @property
    def name(self):return f"{self.member} offene Aufgaben"
    @property
    def unique_id(self):return f"family_chores_{self.member.lower()}_open"
    @property
    def native_value(self):
        return sum(1 for t in self.coordinator.data["today_tasks"] if self.member in t.get("assignees_current",[]) and not t.get("completed_today") and not t.get("pending_confirmation"))
