import * as PokerLogic from "@tg/game-logic/poker";
import Card from "../Card";
import { useLayoutEffect, useRef, useState } from "react";
const PLACEHOLDER_CARDS = 5;
export default function Cards({ cards }: { cards: PokerLogic.Card[] }) {
  const placeholderCards = [];
  const realCards = [];
  const deckRef = useRef<HTMLDivElement>(null);

  const allRef = useRef<HTMLDivElement>(null);

  for (let i = 0; i < PLACEHOLDER_CARDS; i++) {
    placeholderCards.push(<Card key={i} className="tg-poker__table__dealer__placeholder-card" />);
    realCards.push(<Card key={i} className="tg-poker__table__dealer__card" value={i < cards.length ? cards[i] : undefined} />);
  }
  const [windowSz, setWindowSz] = useState({ width: window.innerWidth, height: window.innerHeight });

  useLayoutEffect(() => {
    const handleResize = () => {
      setWindowSz({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  useLayoutEffect(() => {
    if (!deckRef.current || !allRef.current) return;
    const position = {
      left: deckRef.current.offsetLeft,
      top: deckRef.current.offsetTop
    };
    for (let i = cards.length; i < PLACEHOLDER_CARDS; i++) {
      allRef.current.children[i+1].style.top = `${position.top}px`;
      allRef.current.children[i+1].style.left = `${position.left}px`;
    }
    for (let i = 0; i < cards.length; i++) {
      const child = allRef.current.children[i+1+PLACEHOLDER_CARDS]
      const targetPos = {
        left: child.offsetLeft,
        top: child.offsetTop
      };
      allRef.current.children[i+1].style.top = `${targetPos.top}px`;
      allRef.current.children[i+1].style.left = `${targetPos.left}px`;
      allRef.current.children[i+1].style.opacity = 1;
    }
  }, [cards, deckRef.current, allRef.current, windowSz])
  return (
    <div className="tg-poker__table__dealer__cards" ref={allRef}>
      <Card style={{
        zIndex: 1
      }}
      ref={deckRef}/>
      {realCards}
      {placeholderCards}
    </div>
  );
}
