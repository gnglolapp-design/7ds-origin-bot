import { msg } from '../../discord/responses.js';

const ACCENT = 0xC99700;
const ERROR = 0xED4245;

export function ephem(content, embeds = []) {
  return msg("", { content, embeds, flags: 64 });
}

export function err(title, description) {
  return ephem("", [{
    color: ERROR,
    title,
    description,
    footer: { text: "Test · paramètres invalides" },
  }]);
}

export function ok(title, description, fields = [], footer = "Test · enregistré") {
  return ephem("", [{
    color: ACCENT,
    title,
    description,
    fields,
    footer: { text: footer },
  }]);
}

export function qualityLabel(status) {
  if (status === "ok") return "✅ Valide";
  if (status === "suspect") return "⚠️ Suspect";
  return "❌ Rejeté";
}
