import type { CanvasCtx } from './CanvasInteractions';

export const CanvasRelationships = ({ ctx }: { ctx: CanvasCtx }) => {
  const { curves, connections, focusedTag } = ctx;
  return (
    <svg
      className="absolute overflow-visible w-full h-full pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
        </filter>
        {curves.map(({ link: rel }, index) => <marker
          key={rel.id}
          id={`rel-arrow-${index}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={rel.color || '#8b5cf6'} />
        </marker>)}
      </defs>

      {/* Tree Hierarchical Connections */}
      {connections.map((conn) => (
        <path
          key={conn.id}
          d={conn.path}
          fill="none"
          stroke={conn.color}
          strokeWidth={conn.strokeWidth}
          strokeLinecap="round"
          className={`transition-colors duration-200 ${focusedTag ? 'opacity-25' : ''}`}
        />
      ))}

      {/* Cross-node Relationship Links */}
      {curves.map(({ link: rel, path }, index) => {
        const strokeColor = rel.color || '#8b5cf6';

        return (
          <path
            key={rel.id}
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeDasharray={rel.style === 'solid' ? undefined : '5,4'}
            markerEnd={`url(#rel-arrow-${index})`}
            className={`transition-colors duration-200 ${focusedTag ? 'opacity-25' : 'opacity-80 hover:opacity-100'}`}
          />
        );
      })}
    </svg>
  );
};
