export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
};
export function msg(content, opts={}) {
  return { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content, ...opts } };
}
export function update(opts={}) { return { type: InteractionResponseType.UPDATE_MESSAGE, data: { ...opts } }; }
export function autocomplete(choices = []) {
  return { type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT, data: { choices: (choices || []).slice(0, 25) } };
}
export function modal({ custom_id, title, components }) { return { type: InteractionResponseType.MODAL, data: { custom_id, title, components } }; }
