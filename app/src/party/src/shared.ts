import * as Poker from './game-logic/poker';
import { IPartyServerState, IPlayer, ISpectator } from './poker';

export type ClientMessage = {
    type: 'action',
    action: Poker.Action
} | {
    type: 'join-game',
    username: string
}
export type ServerUpdateMessage = {
    type: 'game-ended';
    payouts: { [playerId: string]: number };
    reason: 'showdown' | 'fold' | 'system';
} | {
    type: 'action',
    action: Poker.Action
    player: IPlayer
} | {
    type: 'player-joined',
    player: IPlayer
} | {
    type: 'player-left',
    player: IPlayer
} | {
    type: 'game-started',
    players: IPlayer[]
} | {
    type: 'engine-log',
    message: string
}

export type ServerStateMessage = {
    gameState: Poker.IPokerSharedState | null;
    hand: [Poker.Card, Poker.Card] | null;
    inGamePlayers: IPlayer[];
    spectatorPlayers: ISpectator[];
    state: IPartyServerState;
    clientId: string;
    username: string | null;
    lastUpdates: ServerUpdateMessage[];
    stacks: { [username: string]: number };
    config: Poker.IPokerConfig;
    roundCount: number;
}

export type TableState = {
    id: string;
    spectatorPlayers: ISpectator[];
    inGamePlayers: IPlayer[];
    config: Poker.IPokerConfig;
    gameState: Poker.IPokerSharedState | null;
    // bump this when making breaking changes so the client doesn't try to render it
    version: number;
    round: number;
}
export const TABLE_STATE_VERSION = 0;
