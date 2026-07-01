import { useEffect, useMemo } from "react";

const COLORS = ["#6d56e6", "#4759c4", "#d23f57", "#bd6a16", "#3aa675", "#8b78f0"];
const PIECES = 32;

/**
 * A short, dependency-free confetti burst — rendered when every daily ritual
 * is checked off. Pieces fall from the top edge with per-piece randomized
 * position, drift, spin, and timing; the whole layer removes itself when the
 * longest animation is done. Hidden entirely under prefers-reduced-motion.
 */
export default function Celebration({ onDone }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.4 + Math.random() * 1.0,
        drift: -60 + Math.random() * 120,
        spin: 360 + Math.random() * 540,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    []
  );

  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`confetti-piece ${p.round ? "confetti-round" : ""}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.6),
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--spin": `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
