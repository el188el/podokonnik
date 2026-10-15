/** Валентина Петровна — соседка, которая учит новичка. Нарисована, а не эмодзи. */
export function Granny({ size = 56 }: { size?: number }) {
  return (
    <svg className="granny" viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#fde7c8" />
      <path d="M10 64 Q12 46 32 46 Q52 46 54 64 Z" fill="#6aa96f" />
      <path d="M24 47 L32 56 L40 47" fill="#fff" opacity=".9" />
      <circle cx="32" cy="12" r="7" fill="#c9c7cf" />
      <path d="M14 30 Q14 14 32 14 Q50 14 50 30 Q50 22 44 20 Q36 24 22 21 Q15 24 14 30 Z" fill="#c9c7cf" />
      <ellipse cx="32" cy="32" rx="15" ry="15.5" fill="#f6d2b8" />
      <path d="M17 28 Q19 17 32 17 Q45 17 47 28 Q42 21 32 22 Q22 21 17 28 Z" fill="#dcdae1" />
      <circle cx="25.5" cy="31" r="4.6" fill="#fff" fillOpacity=".35" stroke="#8a6a5a" strokeWidth="1.4" />
      <circle cx="38.5" cy="31" r="4.6" fill="#fff" fillOpacity=".35" stroke="#8a6a5a" strokeWidth="1.4" />
      <path d="M30.1 31 H33.9" stroke="#8a6a5a" strokeWidth="1.4" />
      <path d="M23.5 31.5 Q25.5 29.5 27.5 31.5" stroke="#3b2f2a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M36.5 31.5 Q38.5 29.5 40.5 31.5" stroke="#3b2f2a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="38" r="2.6" fill="#f2a0a0" opacity=".7" />
      <circle cx="42" cy="38" r="2.6" fill="#f2a0a0" opacity=".7" />
      <path d="M27.5 39.5 Q32 43.5 36.5 39.5" stroke="#a0524a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <g transform="translate(43 16)">
        {[[0, -3], [2.9, -0.9], [1.8, 2.4], [-1.8, 2.4], [-2.9, -0.9]].map(([x, y], i) => <circle key={i} r="2.4" cx={x} cy={y} fill="#f07aa0" />)}
        <circle r="1.6" fill="#ffd34d" />
      </g>
    </svg>
  );
}
