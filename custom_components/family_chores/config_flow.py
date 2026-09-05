from __future__ import annotations
import voluptuous as vol
from homeassistant import config_entries
from .const import DOMAIN, CONF_MEMBERS, DEFAULT_MEMBERS

class FamilyChoresConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1
    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            members = [x.strip() for x in user_input[CONF_MEMBERS].split(",") if x.strip()]
            if not members:
                errors["base"] = "no_members"
            else:
                await self.async_set_unique_id(DOMAIN)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title="Family Chores", data={CONF_MEMBERS: members})
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({vol.Required(CONF_MEMBERS, default=", ".join(DEFAULT_MEMBERS)): str}),
            errors=errors,
        )
