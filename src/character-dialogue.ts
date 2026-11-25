import { characterContext, confidenceReply, type NpcId, type ContactWriter } from './characters'
import { openConversation } from './npc-voices'

export function startDialogue(npc: NpcId, record: ContactWriter) {
  let state = record({ type: 'visitNpc', npc })
  const character = characterContext(state, npc)
  openConversation({
    id: character.id,
    name: character.name,
    role: character.role,
    context: () => characterContext(state, npc),
    confidence: (question, answer) => confidenceReply(state, npc, question, answer),
    remember: (memory) => {
      state = record({ type: 'rememberNpc', npc, memory })
    },
  })
}
