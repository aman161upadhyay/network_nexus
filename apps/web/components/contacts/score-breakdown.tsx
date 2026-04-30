interface ScoreBreakdownProps {
  personalScore: number;
  professionalScore: number;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ personalScore, professionalScore }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      <Bar label="Personal" value={personalScore} color="bg-green-500" />
      <Bar label="Professional" value={professionalScore} color="bg-blue-500" />
    </div>
  );
}
