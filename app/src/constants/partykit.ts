const PARTYKIT_HOST = location.hostname !== 'localhost' ? 'ws.turingpoker.com' : 'localhost:1999'

export const PARTYKIT_PROTOCOL = location.hostname !== 'localhost' ? 'https' : 'http'

export const PARTYKIT_URL = `${PARTYKIT_PROTOCOL}://${PARTYKIT_HOST}`;

export const SINGLETON_ROOM_ID = 'tgpoker'
