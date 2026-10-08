'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const GRID = 20;            // celle per lato
const CELL = 20;            // pixel per cella (risoluzione interna del canvas)
const SIZE = GRID * CELL;
const START_MS = 140;       // intervallo iniziale fra due passi
const MIN_MS = 60;          // velocità massima

type Point = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
type Phase = 'idle' | 'running' | 'over';

const VECTORS: Record<Dir, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

type Score = { nickname: string; score: number };

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);   // step() gira dentro un intervallo: gli serve il valore aggiornato
  const [best, setBest] = useState(0);
  const [scores, setScores] = useState<Score[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Lo stato del gioco vive in un ref: cambia a ogni frame e non deve
  // far ridisegnare React sessanta volte al secondo.
  const game = useRef({
    snake: [{ x: 10, y: 10 }] as Point[],
    dir: 'right' as Dir,
    queue: [] as Dir[],      // direzioni premute, applicate una per passo
    food: { x: 15, y: 10 } as Point,
    alive: false
  });

  const loadScores = useCallback(() => {
    fetch('/api/scores')
      .then(r => (r.ok ? r.json() : { scores: [] }))
      .then(d => setScores(d.scores ?? []))
      .catch(() => { /* la classifica è un di più: se non arriva, pazienza */ });
  }, []);

  useEffect(() => {
    loadScores();
    try { setBest(Number(localStorage.getItem('st_snake_best')) || 0); } catch { /* storage bloccato */ }
  }, [loadScores]);

  /** Nuova posizione del cibo, scelta solo fra le celle libere. */
  const placeFood = (snake: Point[]): Point => {
    const free: Point[] = [];
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++)
        if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { snake, food } = game.current;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // griglia tenue, da monitor a fosfori
    ctx.strokeStyle = 'rgba(0,255,65,0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
    }

    // il cibo è una stella, come il cursore
    ctx.fillStyle = '#00e5cc';
    ctx.font = `${CELL}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1);

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#00ff41' : `rgba(0,255,65,${Math.max(0.35, 1 - i / snake.length)})`;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  useEffect(() => { draw(); }, [draw]);

  const step = useCallback(() => {
    const g = game.current;
    if (!g.alive) return;

    // una sola svolta per passo: così premere su+sinistra in fretta
    // non fa svoltare due volte nello stesso istante
    const next = g.queue.shift();
    if (next && next !== OPPOSITE[g.dir] && next !== g.dir) g.dir = next;

    const v = VECTORS[g.dir];
    const head = { x: g.snake[0].x + v.x, y: g.snake[0].y + v.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    // la coda si libera nello stesso passo, quindi l'ultimo segmento non conta
    const hitSelf = g.snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      g.alive = false;
      setPhase('over');
      const final = scoreRef.current;
      setBest(b => {
        const next = Math.max(b, final);
        try { localStorage.setItem('st_snake_best', String(next)); } catch { /* storage bloccato */ }
        return next;
      });
      return;
    }

    g.snake.unshift(head);
    if (head.x === g.food.x && head.y === g.food.y) {
      g.food = placeFood(g.snake);
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else {
      g.snake.pop();
    }
    draw();
  }, [draw]);

  // Il ciclo di gioco accelera man mano che il punteggio sale.
  useEffect(() => {
    if (phase !== 'running') return;
    const ms = Math.max(MIN_MS, START_MS - score * 4);
    const id = setInterval(step, ms);
    return () => clearInterval(id);
  }, [phase, score, step]);

  const turn = useCallback((dir: Dir) => {
    const g = game.current;
    if (g.queue.length < 2) g.queue.push(dir);
  }, []);

  const start = () => {
    const g = game.current;
    g.snake = [{ x: 10, y: 10 }];
    g.dir = 'right';
    g.queue = [];
    g.food = placeFood(g.snake);
    g.alive = true;
    scoreRef.current = 0;
    setScore(0);
    setSaved(false);
    setPhase('running');
    draw();
  };

  // Tastiera. Le frecce bloccano lo scorrimento della pagina solo mentre
  // si gioca: fuori dalla partita la pagina resta navigabile normalmente.
  useEffect(() => {
    const keys: Record<string, Dir> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right'
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = keys[e.key];
      if (!dir || phase !== 'running') return;
      e.preventDefault();
      turn(dir);
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, turn]);

  // Scorrimento del dito sul canvas: direzione dall'asse prevalente.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [turn]);

  const saveScore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nickname = (new FormData(form).get('nickname') as string || '').trim();
    if (!nickname || score <= 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, score })
      });
      if (res.ok) { setSaved(true); loadScores(); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="game-shell">
      <div className="game-hud">
        <span>PUNTI: {String(score).padStart(3, '0')}</span>
        <span>RECORD: {String(best).padStart(3, '0')}</span>
      </div>

      <canvas ref={canvasRef} className="game-canvas" width={SIZE} height={SIZE}
              aria-label="Gioco del serpente" role="img" />

      {phase === 'idle' && (
        <>
          <button className="game-btn" onClick={start}>▶ GIOCA</button>
          <p className="game-hint">FRECCE O WASD · SU MOBILE SCORRI IL DITO</p>
        </>
      )}

      {phase === 'running' && (
        <div className="game-pad" aria-hidden="true">
          <span />
          <button type="button" onClick={() => turn('up')}>▲</button>
          <span />
          <button type="button" onClick={() => turn('left')}>◀</button>
          <button type="button" onClick={() => turn('down')}>▼</button>
          <button type="button" onClick={() => turn('right')}>▶</button>
        </div>
      )}

      {phase === 'over' && (
        <>
          <p className="game-hint" style={{ color: 'var(--red)' }}>GAME OVER — {score} PUNTI</p>
          {score > 0 && !saved && (
            <form onSubmit={saveScore} style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 360 }}>
              <input type="text" name="nickname" maxLength={16} required
                     placeholder="IL TUO NOME" aria-label="Nome per la classifica" />
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? '...' : 'SALVA'}
              </button>
            </form>
          )}
          {saved && <p className="game-hint" style={{ color: 'var(--green)' }}>PUNTEGGIO SALVATO ★</p>}
          <button className="game-btn" onClick={start}>↺ RIGIOCA</button>
        </>
      )}

      {scores.length > 0 && (
        <div className="scoreboard">
          <div className="section-label" style={{ marginTop: 8 }}>CLASSIFICA</div>
          <ol style={{ margin: 0, padding: 0 }}>
            {scores.map((s, i) => (
              <li key={`${s.nickname}-${i}`}>
                <span><span className="pos">{String(i + 1).padStart(2, '0')}</span> {s.nickname}</span>
                <span>{s.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
