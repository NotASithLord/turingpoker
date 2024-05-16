import { useState, useEffect } from 'react'
import * as React from 'react';
import * as ReactDOM from "react-dom";
import {
  createBrowserRouter,
  RouterProvider,
  Link
} from "react-router-dom";
import { createRoot } from "react-dom/client";
import PartySocket from "partysocket";
import Poker from "./components/poker/Poker";
import * as PokerLogic from "./party/src/game-logic/poker";
import { ServerStateMessage, ServerUpdateMessage } from "./party/src/shared";
import { ClerkProvider } from '@clerk/clerk-react'
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import '@static/styles/styles.css'
import Home from './pages/home';

export type ClientState = {
  isConnected: boolean;
  serverState: ServerStateMessage | null;
  socket: PartySocket | null;
  playerId: string | null;
  updateLog: ServerUpdateMessage[];
};

export default function Client() {
  let [clientState, setClientState] = useState<ClientState>({
    isConnected: false,
    serverState: null,
    socket: null,
    playerId: null,
    updateLog: [],
  });

  const [previousActions, setPreviousActions] = useState<Record<string, PokerLogic.Action>>({});

  useEffect(() => {
    console.log('opening')
    const connectSocket = () => {
      const socket = new PartySocket({
        host: 'localhost:1999',
        room: "my-new-room"
      });

      socket.addEventListener("open", () => {
        console.log('opened')
        setClientState((prevState) => ({
          ...prevState,
          isConnected: true,
          playerId: socket.id,
          socket: socket,
        }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const data: ServerStateMessage = JSON.parse(event.data);
          for (const update of data.lastUpdates) {
            if (update.type == 'game-ended') {
              console.log('done')
              setPreviousActions({})
            }
            if (update.type == 'action') {
              setPreviousActions((prevState) => ({
                ...prevState,
                [update.player.playerId]: update.action,
              }));
            }
          }
          setClientState((prevState) => ({
            ...prevState,
            serverState: data,
            updateLog: [...prevState.updateLog, ...data.lastUpdates].slice(-1000),
          }));
        } catch {
          setClientState((prevState) => ({
            ...prevState,
            serverState: null,
          }));
        }
      });

      socket.addEventListener("close", () => {
        setClientState((prevState) => ({
          ...prevState,
          isConnected: false,
        }));
      });

      socket.addEventListener("error", (event) => {
        console.error("WebSocket error:", event);
      });

      setClientState((prevState) => ({
        ...prevState,
        socket: socket,
      }));
    };

    connectSocket();

    return () => {
      if (clientState.socket) {
        clientState.socket.close();
      }
    };
  }, [setClientState]);

  return (
    <Poker clientState={clientState} previousActions={previousActions} />
  );
};

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    children: [
      {
        path: "play",
        element: <Client />,
      },
    ],
  },
]);


window.addEventListener('load', () => {
  const rootDiv = document.getElementById("root");
  console.log('loaded')
  const root = createRoot(rootDiv!);
  root.render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </ClerkProvider>
  );
});