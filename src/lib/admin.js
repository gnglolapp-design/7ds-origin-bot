import { ADMIN_ROLE_ID } from "../constants.js";
import { msg } from "../discord/responses.js";

const ERROR_ACCENT = 0xED4245;

export function memberHasAdminRole(interaction) {
  const roles = interaction?.member?.roles || [];
  return Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID);
}

export function denyAdminCommand(commandName = "Commande") {
  return msg("", {
    embeds: [{
      color: ERROR_ACCENT,
      title: `${commandName} — accès refusé`,
      description: `Cette commande est réservée au rôle staff autorisé (**${ADMIN_ROLE_ID}**).`,
      footer: { text: `${commandName} · rôle requis` },
    }],
    flags: 64,
  });
}
