import type * as Party from "partykit/server";
import { json, notFound } from "./utils/response";
import { TableState } from "./shared";

/**
 * The tables party's purpose is to keep track of all chat rooms, so we want
 * every client to connect to the same room instance by sharing the same room id.
 */
export const SINGLETON_ROOM_ID = "tgpoker";

/** Poker room sends an update whenever server state changes */
export type RoomInfoUpdateRequest = {
  action: 'update';
  id: string;
  tableState: TableState;
};

export type RoomDeleteRequest = {
  id: string;
  action: "delete";
};

export default class TablesServer implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: true,
    // this opts the chat room into hibernation mode, which
    // allows for a higher number of concurrent connections
  };

  constructor(public party: Party.Party) { }

  async onConnect(connection: Party.Connection) {
    // when a websocket connection is established, send them a list of rooms
    connection.send(JSON.stringify(await this.getActiveRooms()));
  }

  async onRequest(req: Party.Request) {
    // we only allow one instance of chatRooms party
    if (this.party.id !== SINGLETON_ROOM_ID) return notFound();

    // Clients fetch list of rooms for server rendering pages via HTTP GET
    if (req.method === "GET") return json(await this.getActiveRooms());

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
  async getActiveRooms(): Promise<TableState[]> {
    const rooms = await this.party.storage.list<TableState>();
    return [...rooms.values()];
  }
  /** Updates list of active rooms with information received from chatroom */
  async updateRoomInfo(req: Party.Request) {
    const update = (await req.json()) as
      | RoomInfoUpdateRequest
      | RoomDeleteRequest;

    if (update.action === "delete") {
      await this.party.storage.delete(update.id);
      return this.getActiveRooms();
    }

    const info = update.tableState;
    if (info.spectatorPlayers.length + info.inGamePlayers.length == 0) {
      // if no users are present, delete the room
      await this.party.storage.delete(update.id);
      return this.getActiveRooms();
    }

    this.party.storage.put(update.id, info);

    await this.party.storage.put(update.id, info);
    return this.getActiveRooms();
  }
}
