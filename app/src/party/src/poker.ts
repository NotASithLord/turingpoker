import type * as Party from 'partykit/server';
import * as Poker from '@app/party/src/game-logic/poker'
import { ClientMessage, ServerStateMessage, ServerUpdateMessage, TABLE_STATE_VERSION, TableState } from './shared';
import { SINGLETON_ROOM_ID } from '@app/constants/partykit';

export interface ISpectator {
  playerId: string;
}

export interface IPlayer extends ISpectator {
  username: string;
}

export interface IPartyServerState {
  gamePhase: 'pending' | 'active' | 'finished'
}

export const AUTO_START = true;
export const MIN_PLAYERS_AUTO_START = 2;
export const MAX_PLAYERS = 8

export default class PartyServer implements Party.Server {
  public gameState: Poker.IPokerGame | null = null;
  public gameConfig: Poker.IPokerConfig = {
    defaultStack: 1000,
    dealerPosition: 0,
    bigBlind: 100,
    maxRounds: 100,
    timeout: 1e9,
    maxPlayers: MAX_PLAYERS,
    smallBlind: 50,
    autoStart: AUTO_START,
    minPlayers: MIN_PLAYERS_AUTO_START,
  };
  public inGamePlayers: IPlayer[] = [];
  public spectatorPlayers: ISpectator[] = [];
  public stacks: Record<string, number> = {};
  public roundCount: number = 0;
  public serverState: IPartyServerState = {
    gamePhase: "pending",
  };
  public lastActed: Record<string, number> = {};

  public timeoutLoopInterval: NodeJS.Timeout | null = null;

  public queuedUpdates: ServerUpdateMessage[] = [];

  constructor(public readonly party: Party.Party) {}

  onStart(): void | Promise<void> {
    // read game config from room id
    const roomId = this.party.id;
    const config = roomId.split('-').slice(1);
    for (const s of config) {
      const [key, val] = s.split('=');
      if (key in this.gameConfig) {
        this.gameConfig[key] = parseInt(val);
      }
    }

    this.timeoutLoopInterval = setInterval(() => {
      // check if anyone should be disconnected
      for (const player of this.inGamePlayers) {
        // if it's not this players turn then we don't want to disconnect them
        if (!this.lastActed[player.username] || this.gameState?.state.whoseTurn != player.username)
          this.lastActed[player.username] = Date.now();
        if (
          this.serverState.gamePhase == "active" &&
          Date.now() - this.lastActed[player.username] > this.gameConfig.timeout
        ) {
          this.takeDefaultAction(player.playerId);
        }
      }
    }, 10);
  }

  // Start as soon as two players are in
  // get random game if they exist, show to user
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): void {
    console.log(ctx.request.cf);
    if (this.inGamePlayers.length < 2) {
      this.serverState.gamePhase = "pending";
    }

    this.addPlayer(conn.id);
  }

  onClose(conn: Party.Connection) {
    // remove from spectators
    this.spectatorPlayers = this.spectatorPlayers.filter(
      (player) => player.playerId !== conn.id
    );
  }

  onMessage(message: string, websocket: Party.Connection): void {
    try {
      let data: ClientMessage;

      if (typeof message === "string") {
        // Check if the message is string to parse it
        data = JSON.parse(message);
      } else {
        throw new Error("Invalid message type");
      }

      if (data.type == "action" && Poker.isAction(data.action)) {
        this.handlePlayerAction(websocket.id, data.action);
      } else if (data.type == "join-game") {
        this.playerJoinGame(websocket.id, data.username);
      } else {
        console.error("Invalid message type", data);
      }
    } catch (error) {
      console.error(`Error parsing message from ${websocket.id}:`, error);
      if (typeof websocket.send === "function") {
        websocket.send(
          JSON.stringify({ error: "Error processing your action" })
        );
      } else {
        console.error("websocket.send is not a function", websocket);
      }
    }
  }

  takeDefaultAction(playerId: string) {
    if (!this.gameState) {
      return;
    }
    const username = this.inGamePlayers.find((p) => p.playerId === playerId)?.username;
    const player = this.gameState.state.players.find(
      (player) => player.id === username
    );
    if (!player) {
      return;
    }
    if (player.folded || this.gameState.state.whoseTurn !== username) {
      return;
    }
    if (player.currentBet < this.gameState.state.targetBet) {
      this.handlePlayerAction(playerId, {
        type: 'fold'
      });
    } else {
      this.handlePlayerAction(playerId, {
        type: 'call'
      });
    }
  }


  handlePlayerAction(playerId: string, action: Poker.Action) {
    const player = this.inGamePlayers.find((p) => p.playerId === playerId);
    if (!player) {
      console.log(
        "Player attempted to make action while not in game",
        playerId
      );
      return;
    }
    const username = player.username;
    if (!this.gameState) {
      console.log(
        "Player attempted to make action while game is not active",
        username
      );
      return;
    }

    if (
      this.gameState.state.whoseTurn !== username ||
      this.gameState.state.done
    ) {
      console.log("Player attempted to make action out of turn", username);
      return;
    }

    try {
      const { next, log } = Poker.step(this.gameState, action);
      for (const message of log) {
        this.queuedUpdates.push({
          type: "engine-log",
          message,
        });
      }
      this.gameState = next;
      this.queuedUpdates.push({
        type: "action",
        action,
        player,
      });
    } catch (err) {
      console.log(err);
    }
    if (this.gameState.state.done) {
      this.endGame(
        this.gameState?.state?.round === "showdown" ? "showdown" : "fold"
      );
    }
    this.broadcastGameState();
  }

  startGame() {
    if (this.roundCount >= this.gameConfig.maxRounds) {
      return;
    }
    if (this.gameState && !this.gameState.state.done) {
      return;
    }
    /*
    Shouldn't do this
    // if anyone has zero chips just reset them to 1000
    for (const player of this.inGamePlayers) {
      if (this.stacks[player.username] <= 0) {
        this.stacks[player.username] = defaultStack;
      }
    }*/
    this.gameState = Poker.createPokerGame(
      this.gameConfig,
      this.inGamePlayers.map((p) => p.username),
      this.inGamePlayers.map((p) => this.stacks[p.username])
    );
    this.serverState.gamePhase = "active";

    this.queuedUpdates.push({
      type: "game-started",
      players: this.inGamePlayers,
    });

    this.broadcastGameState();
  }

  endGame(reason: "showdown" | "fold" | "system") {
    if (!this.gameState) {
      return;
    }

    const { payouts, log } = Poker.payout(
      this.gameState.state,
      this.gameState.hands
    );

    for (const message of log) {
      this.queuedUpdates.push({
        type: "engine-log",
        message,
      });
    }
    for (const username in payouts) {
      this.stacks[username] =
        (this.gameState.state.players.find((player) => player.id == username)
          ?.stack ?? 0) + payouts[username];
    }
    this.serverState.gamePhase = "pending";
    this.queuedUpdates.push({
      type: "game-ended",
      payouts,
      reason,
    });
    this.gameState = null;
    this.gameConfig.dealerPosition = (this.gameConfig.dealerPosition + 1) % this.inGamePlayers.length;
    this.roundCount++;
    if (this.roundCount >= this.gameConfig.maxRounds) {
      this.serverState.gamePhase = "finished";
    }
    this.broadcastGameState();
    if (this.gameConfig.autoStart && this.inGamePlayers.length >= MIN_PLAYERS_AUTO_START) {
      this.startGame();
    }
  }

  getStateMessage(playerId: string): ServerStateMessage {
    const isSpectator =
      this.spectatorPlayers.map((s) => s.playerId).indexOf(playerId) !== -1;

    const username = this.inGamePlayers.find((p) => p.playerId === playerId)?.username;

    return {
      gameState: this.gameState?.state ?? null,
      hand: this.gameState?.hands?.[username ?? ''] ?? null,
      inGamePlayers: this.inGamePlayers,
      spectatorPlayers: this.spectatorPlayers,
      username: username ?? null,
      config: this.gameConfig,
      state: this.serverState,
      roundCount: this.roundCount,
      stacks: this.stacks,
      clientId: playerId,
      lastUpdates: this.queuedUpdates,
    };
  }

  broadcastGameState() {
    for (const player of this.spectatorPlayers
      .concat(this.inGamePlayers)) {
      const message: ServerStateMessage = this.getStateMessage(player.playerId);

      // Send game state; ensure spectators do not receive any cards information
      const conn = this.party.getConnection(player.playerId);
      if (conn) {
        conn.send(JSON.stringify(message));
      }
    }
    this.queuedUpdates = [];

    const tableState: TableState = {
      spectatorPlayers: this.spectatorPlayers,
      inGamePlayers: this.inGamePlayers,
      config: this.gameConfig,
      gameState: this.gameState?.state ?? null,
      id: this.party.id,
      version: TABLE_STATE_VERSION,
      round: this.roundCount,
      stacks: this.stacks,
    }

    return this.party.context.parties.tables.get(SINGLETON_ROOM_ID).fetch({
      method: "POST",
      body: JSON.stringify({
        id: this.party.id,
        action: 'update',
        tableState
      }),
    });
  }

  playerJoinGame(playerId: string, username: string) {
    if (this.inGamePlayers.find((player) => player.playerId === playerId)) {
      return;
    }

    // Check if there is a player with same username and different id in the game
    const existingPlayer = this.inGamePlayers.find((player) => player.username === username);
    if (existingPlayer) {
      console.log('conflicting username')
      // Check if the id is connected
      if (!this.party.getConnection(existingPlayer.playerId)) {
        console.log('no connection')
        // If the id is not connected, update the id to this one
        existingPlayer.playerId = playerId; // (update by reference)
        console.log(existingPlayer, this.inGamePlayers)
        // remove the old player from the spectator list
        this.spectatorPlayers = this.spectatorPlayers.filter(
          (player) => player.playerId !== playerId
        );
        this.broadcastGameState();
      }
      return;
    }

    this.spectatorPlayers = this.spectatorPlayers.filter(
      (player) => player.playerId !== playerId
    );
    if (this.serverState.gamePhase === "pending") {
      this.stacks[username] = this.gameConfig.defaultStack;
      this.inGamePlayers.push({
        playerId,
        username
      });
      this.queuedUpdates.push({
        type: "player-joined",
        player: {
          playerId,
          username
        },
      });
    }

    if (
      this.gameConfig.autoStart &&
      this.serverState.gamePhase === "pending" &&
      this.inGamePlayers.length >= MIN_PLAYERS_AUTO_START
    ) {
      this.startGame();
    } else {
      this.broadcastGameState();
    }
  }

  addPlayer(playerId: string) {
    if (this.playerExists(playerId)) return;
    this.spectatorPlayers.push({
      playerId
    });

    this.broadcastGameState();
  }

  playerExists(playerId: string) {
    const playerCmp = (player: ISpectator) => player.playerId === playerId

    return (
      this.inGamePlayers.find(playerCmp) !==
        undefined ||
      this.spectatorPlayers.find(playerCmp) !==
        undefined
    );
  }

  /** Remove this room from the room listing party */
  async removeRoomFromRoomList(id: string) {
    return this.party.context.parties.tables.get(SINGLETON_ROOM_ID).fetch({
      method: "POST",
      body: JSON.stringify({
        id,
        action: "delete",
      }),
    });
  }

  /**
   * A scheduled job that executes when the room storage alarm is triggered
   */
  async onAlarm() {
    // alarms don't have access to room id, so retrieve it from storage
    const id = await this.party.storage.get<string>("id");
    if (id) {
      // await this.removeRoomMessages();
      // await this.removeRoomFromRoomList(id);
    }
  }
}
