import React from 'react';

interface AiFactCardProps {
  fact: string;
  sourceType: string;
  date: string;
  style?: React.CSSProperties;
}

export function AiFactCard({ fact, sourceType, date, style }: AiFactCardProps) {
  // A slight random rotation for the "pinned to corkboard" look
  const rotation = Math.floor(Math.random() * 4) - 2;

  return (
    <div 
      className="ws-card ws-card--plain"
      style={{
        position: 'relative',
        padding: '1rem',
        border: '1.5px solid #2A7C75',
        backgroundColor: 'rgba(42,124,117,0.05)',
        boxShadow: '0 4px 12px rgba(26,26,24,0.06)',
        ...style,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#D49A89', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
      <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1A1A18', marginBottom: '0.5rem' }}>{fact}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(26,26,24,0.6)', borderTop: '1px solid rgba(42,124,117,0.2)', paddingTop: '0.5rem', marginTop: '1rem' }}>
        <span>Source: {sourceType}</span>
        <span>{new Date(date).toLocaleDateString()}</span>
      </div>
      {/* 
        The thread line connecting back to the source is visually implemented
        by absolutely positioning an SVG line from this card to its parent container.
      */}
      <svg style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '64px', transform: 'translateY(-100%)', overflow: 'visible', pointerEvents: 'none' }}>
        <line x1="0" y1="0" x2="0" y2="64" stroke="#2A7C75" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    </div>
  );
}
