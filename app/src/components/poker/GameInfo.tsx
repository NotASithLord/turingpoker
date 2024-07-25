import React, { useEffect } from "react";
import { ClientState } from "@app/client";
import GameLog from "./GameLog";
import { ServerStateMessage } from "@tg/shared";
import Collapse, { CollapseToggle } from "../Collapse";
import useSmallScreen from "@app/hooks/useSmallScreen";
import { Text } from "@radix-ui/themes";
import Logo from '@static/images/logo.png'

export function GameInfo({
  clientState, serverState, getPlayerStatus
}: {
  clientState: ClientState;
  serverState: ServerStateMessage;
  getPlayerStatus: (playerId: string) => string;
}) {
  const collapsible = useSmallScreen();
  const [collapsed, setCollapsed] = React.useState(true);

  return <div style={{
    position: collapsible ? "absolute" : undefined,
    height: '100%'
  }}>
    <Collapse collapsed={collapsible && collapsed}>
      <div className="tg-poker__table__gameinfo">
        {/* <Header
          // gameType={gameType}
          players={clientState.serverState?.inGamePlayers || []}
          playerId={clientState.playerId}
          minPlayers={clientState.serverState?.config?.minPlayers || 2} /> */}
        <div className="flex flex-col items-center font-mono">
          <div className="flex justify-left px-[12px] py-[8px] text-left relative bg-[black] left-0 border border-2 border-green" >
            <div className='m-[8px] z-[2]'>
              <img className="h-[40px]" src={Logo} alt="Logo" />
            </div>
            {/* text */}
            <div className='relative z-[3] text-center flex items-center flex-col' >
              <h2 className="m-0">{false ? `Table: ${'gameType'}` : 'Welcome!'}</h2>
              <Text>Turing Games</Text>
            </div>
            <div className='m-[8px] z-[2]'>
              <img className="h-[40px]" src={Logo} alt="Logo" />
            </div>
            {
              Array(4).fill('_').map((_, i) => (
                <div className={`tg-header__squares tg-header__squares--${i}`} key={i} > </div>
              ))}
          </div>
        </div>
        <div className="tg-poker__table__players terminal_text">
          <h4 className="terminal_text">Players</h4>
          {serverState.spectatorPlayers
            .concat(serverState.queuedPlayers)
            .map((spectator, index) => (
              <div key={index} className="tg-poker__table__players__player">
                <p>{`Spectator ${index + 1}:`}</p>
                <p>{`${getPlayerStatus(spectator.playerId)}`}</p>
              </div>
            ))}
          {serverState.inGamePlayers
            .map((spectator, index) => (
              <div key={index} className="tg-poker__table__players__player">
                <p>{`Player ${index + 1}:`}</p>
                <p>{`${getPlayerStatus(spectator.playerId)}`}</p>
              </div>
            ))}
        </div>
        <GameLog gameLog={clientState.updateLog} />
      </div>
      {collapsible &&
        <CollapseToggle
          collapsed={collapsed}
          style={{
            top: '12px',
            transition: 'right 0.2s',
          }}
          content={collapsed ? "Show Info" : "Hide Info"}
          setCollapsed={setCollapsed}
        />
      }
    </Collapse>
  </div>;
}
