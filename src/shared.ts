import * as Poker from './game-logic/poker';
import { IPartyServerState, IPlayer } from './server';

export type ClientMessage = {
    type: 'action',
    action: Poker.Action
} | {
    type: 'start-game'
} | {
    type: 'spectate'
} | {
    type: 'join-game'
} | {
    type: 'reset-game'
}

export type ServerStateMessage = {
    gameState: Poker.IPokerSharedState | null;
    hand: [Poker.Card, Poker.Card] | null;
    inGamePlayers: IPlayer[];
    spectatorPlayers: IPlayer[];
    queuedPlayers: IPlayer[];
    players: IPlayer[];
    state: IPartyServerState;
    clientId: string;
}