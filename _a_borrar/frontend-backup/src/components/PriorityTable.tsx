import RiskBadge from "./RiskBadge";

interface Module {
  file_path: string;
  risk_score: number;
  deficiency_count: number;
  rank?: number;
}

interface PriorityTableProps {
  data: Module[];
  onRowClick?: (module: Module) => void;
}

export default function PriorityTable({ data, onRowClick }: PriorityTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-cyan-500/20 bg-slate-700/50">
            <th className="text-left p-4 text-cyan-400 font-semibold">Rank</th>
            <th className="text-left p-4 text-cyan-400 font-semibold">Archivo</th>
            <th className="text-left p-4 text-cyan-400 font-semibold">
              Risk Score
            </th>
            <th className="text-left p-4 text-cyan-400 font-semibold">
              Deficiencias
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((module, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(module)}
              className="border-b border-cyan-500/10 hover:bg-slate-700/50 cursor-pointer transition"
            >
              <td className="p-4 text-white font-semibold">#{idx + 1}</td>
              <td className="p-4 text-slate-300 truncate text-sm">
                {module.file_path}
              </td>
              <td className="p-4">
                <RiskBadge score={module.risk_score} size="sm" />
              </td>
              <td className="p-4 text-white">{module.deficiency_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}