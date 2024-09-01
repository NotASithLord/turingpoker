import type * as Party from "partykit/server";
import { json, notFound } from "../../utils/response";
import { TableState } from "./shared";
import PartyServer from "./main";

/**
 * The tables party's purpose is to keep track of all games, so we want
 * every client to connect to the same room instance by sharing the same room id.
 */
export const SINGLETON_ROOM_ID = "games";

/** Poker room sends an update whenever server state changes */
export type RoomCreateRequest = {
  action: 'create';
  id: string;
  tableState: TableState;
};

export type RoomUpdateRequest = {
  action: 'update';
  id: string;
  tableState: TableState;
};

export type RoomDeleteRequest = {
  id: string;
  action: "delete";
};

export default class TablesServer extends PartyServer {
  options: Party.ServerOptions = {
    hibernate: true,
    // this opts the chat room into hibernation mode, which
    // allows for a higher number of concurrent connections
  };

  constructor(public party: Party.Party) {
    super(party)
  }

  async onConnect(connection: Party.Connection) {
    // when a websocket connection is established, send them a list of rooms
    // await this.party.storage.deleteAll();
    connection.send(JSON.stringify(await this.getRooms()));
  }

  async onRequest(req: Party.Request) {
    console.log({ req })
    // we only allow one instance of chatRooms party
    // if (this.party.id !== SINGLETON_ROOM_ID) return notFound();

    // Clients fetch list of rooms for server rendering pages via HTTP GET
    if (req.method === "GET") return json(await this.getRooms(req));

    // Chatrooms report their connections via HTTP POST
    // update room info and notify all connected clients
    if (req.method === "POST") {
      const roomList = await this.updateRoomInfo(req);
      this.party.broadcast(JSON.stringify(roomList));
      return json(roomList);
    }

    // admin api for clearing all rooms (not used in UI)
    if (req.method === "DELETE") {
      await this.party.storage.deleteAll();
      return json({ message: "All room history cleared" });
    }

    return notFound();
  }

  /** Fetches list of active rooms */
  // await this.party.storage.deleteAll();
  async getRooms(req?: any): Promise<TableState[] | TableState> {
    const partyId = this.party.id
    if (partyId !== SINGLETON_ROOM_ID) {
      const room = await this.party.storage.get<TableState>(partyId);
      console.log(room)
      return room;
    } else {
      const gameType = new URLSearchParams(req?.url?.split("?")?.[1]).get("gameType");
      const gameStatus = new URLSearchParams(req?.url?.split("?")?.[1]).get("gameStatus");
      let rooms = await this.party.storage.list<TableState>();
      if (gameType) {
        rooms = Array.from(rooms?.values())?.filter(room => {
          if (gameType && room.gameType !== gameType) return false;
          return true;
        })
      }

      return [...rooms.values()];
    }
  }
  /** Updates table with information received from game */
  async updateRoomInfo(req: Party.Request) {
    const update = (await req.json()) as
      | RoomUpdateRequest
      | RoomDeleteRequest
      | RoomCreateRequest;

    if (update.action === "delete") {
      await this.party.storage.delete(update.id);
      // await this.party.storage.deleteAll();
      return this.getRooms();
    }

    const info = update.tableState;
    const totalPlayers = info?.queuedPlayers?.length + info?.spectatorPlayers?.length + info?.inGamePlayers?.length;

    await this.party.storage.put(update.id, info);
    // await this.party.storage.deleteAll();
    return this.getRooms();
  }
}
