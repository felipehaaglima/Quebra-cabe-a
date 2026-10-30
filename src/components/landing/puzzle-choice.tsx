'use client';
import { useState } from 'react';
import Link from 'next/link';

export function PuzzleChoice() {
  const [count, setCount] = useState('24');
  return <>
    <label className="puzzle-choice">Número de peças
      <select value={count} onChange={(event) => setCount(event.target.value)}>
        <option value="24">24 peças · tranquilo</option>
        <option value="48">48 peças · mais desafiador</option>
      </select>
    </label>
    <Link className="start-button" href={count === '48' ? '/play?pieces=48' : '/play'} aria-describedby="aviso">Iniciar <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg></Link>
  </>;
}
