"use client";

interface RelationshipRingProps {
  personalScore: number;
  professionalScore: number;
  size?: number;
  photoUrl?: string | null;
  displayName: string;
}

function scoreToColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

export function RelationshipRing({
  personalScore,
  professionalScore,
  size = 56,
  photoUrl,
  displayName,
}: RelationshipRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = size / 2 - 8;
  const strokeWidth = 3;

  function arc(r: number, score: number) {
    if (score === 0) return "";
    const startAngle = -90;
    const fraction = score / 100;
    const angle = fraction * 360;
    const end = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        {professionalScore > 0 && (
          <path
            d={arc(outerR, professionalScore)}
            fill="none"
            stroke={scoreToColor(professionalScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {personalScore > 0 && (
          <path
            d={arc(innerR, personalScore)}
            fill="none"
            stroke={scoreToColor(personalScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          width: size - 16,
          height: size - 16,
          borderRadius: "50%",
          overflow: "hidden",
          background: "rgba(59,130,246,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.25,
          fontWeight: 600,
          color: "#93c5fd",
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}
