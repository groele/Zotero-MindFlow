import React, { useId } from 'react';

interface MindFlowMarkProps {
  className?: string;
}

/** Tapered Galaxy Flow (彗尾星云图谱) - Official MindFlow Brand Mark */
export const MindFlowMark: React.FC<MindFlowMarkProps> = ({ className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const hubId = `mfG2Hub-${uid}`;
  const arm1Id = `mfG2Arm1-${uid}`;
  const arm2Id = `mfG2Arm2-${uid}`;
  const arm3Id = `mfG2Arm3-${uid}`;
  const shadowId = `mfG2Sh-${uid}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 128"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id={hubId} x1="36" y1="42" x2="82" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id={arm1Id} x1="56" y1="64" x2="104" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={arm2Id} x1="56" y1="64" x2="24" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id={arm3Id} x1="56" y1="64" x2="96" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.2" floodColor="#0F172A" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* 变径星云引力臂 */}
      <path d="M 52 56 Q 74 34, 96 28 L 100 35 Q 78 46, 62 66 Z" fill={`url(#${arm1Id})`} />
      <path d="M 48 64 Q 30 52, 22 36 L 28 31 Q 40 44, 58 56 Z" fill={`url(#${arm2Id})`} />
      <path d="M 62 60 Q 82 74, 96 94 L 89 100 Q 72 82, 52 70 Z" fill={`url(#${arm3Id})`} />
      <path d="M 50 66 Q 36 82, 24 94 L 30 99 Q 44 86, 58 72 Z" fill="#14B8A6" />

      {/* 外围卫星节点 */}
      <g filter={`url(#${shadowId})`}>
        <circle cx="99" cy="31" r="16" fill="#06B6D4" />
        <circle cx="99" cy="31" r="15.25" stroke="#BAE6FD" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle cx="25" cy="33" r="13" fill="#3B82F6" />
        <circle cx="25" cy="33" r="12.25" stroke="#BFDBFE" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="93" cy="97" r="15" fill="#F97316" />
        <circle cx="93" cy="97" r="14.25" stroke="#FED7AA" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="27" cy="96" r="11" fill="#10B981" />
        <circle cx="27" cy="96" r="10.25" stroke="#A7F3D0" strokeOpacity="0.45" strokeWidth="1.5" />
      </g>

      {/* 中心双环星核与四芒星标 */}
      <g filter={`url(#${shadowId})`}>
        <circle cx="56" cy="64" r="24" fill={`url(#${hubId})`} />
        <circle cx="56" cy="64" r="23.25" stroke="#EDE9FE" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle cx="56" cy="64" r="15" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2.5" />
        <path
          d="M 56 54 C 56 61, 59 64, 66 64 C 59 64, 56 67, 56 74 C 56 67, 53 64, 46 64 C 53 64, 56 61, 56 54 Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
};
