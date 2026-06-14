import React from 'react';

interface HeritageMotifProps {
  className?: string;
  /** stroke colour — pass a token, e.g. "var(--color-on-forest-2)" */
  stroke?: string;
  /** when true (default) the seal slowly turns and its kola heart breathes;
   *  set false for a static mark. Motion is stilled under reduced-motion. */
  animated?: boolean;
}

/**
 * Hand-built Tier-B SVG. A concentric rosette with a radial spoke ring —
 * an abstraction of the seal that frames the Ife bronze in the PLYSS mark.
 * Pure geometry: no AI-illustration, no stock.
 *
 * When animated, the rosette rotates very slowly and the four-petal kola
 * motif at the centre gently blooms — a quiet nod to Yoruba emblem geometry.
 */
const HeritageMotif: React.FC<HeritageMotifProps> = ({
  className = '',
  stroke = 'var(--color-on-forest-2)',
  animated = true,
}) => {
  const spokes = Array.from({ length: 24 });
  return (
    <svg
      viewBox="0 0 200 200"
      role="presentation"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke={stroke}
    >
      {/* Rosette + spoke ring — turns slowly as one */}
      <g className={animated ? 'heritage-ring' : undefined}>
        <circle cx="100" cy="100" r="92" strokeWidth="0.75" opacity="0.5" />
        <circle cx="100" cy="100" r="70" strokeWidth="0.75" opacity="0.7" />
        <circle cx="100" cy="100" r="46" strokeWidth="1" />
        <circle cx="100" cy="100" r="22" strokeWidth="1" />
        {spokes.map((_, i) => {
          const angle = (i / spokes.length) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 46;
          const y1 = 100 + Math.sin(angle) * 46;
          const x2 = 100 + Math.cos(angle) * 70;
          const y2 = 100 + Math.sin(angle) * 70;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.6" opacity="0.55" />
          );
        })}
      </g>

      {/* Four-petal kola motif at the centre — breathes */}
      <g className={animated ? 'heritage-bloom' : undefined}>
        <path d="M100 80 Q110 100 100 120 Q90 100 100 80 Z" strokeWidth="1" />
        <path d="M80 100 Q100 110 120 100 Q100 90 80 100 Z" strokeWidth="1" />
      </g>
    </svg>
  );
};

export default HeritageMotif;
