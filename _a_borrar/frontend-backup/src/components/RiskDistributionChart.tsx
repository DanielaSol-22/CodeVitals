import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskDistributionChartProps {
  data: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export default function RiskDistributionChart({
  data,
}: RiskDistributionChartProps) {
  const chartData = {
    labels: ["Alto Riesgo", "Riesgo Medio", "Bajo Riesgo"],
    datasets: [
      {
        data: [data.HIGH, data.MEDIUM, data.LOW],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(217, 119, 6, 0.8)",
          "rgba(34, 197, 94, 0.8)",
        ],
        borderColor: [
          "rgba(239, 68, 68, 1)",
          "rgba(217, 119, 6, 1)",
          "rgba(34, 197, 94, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "rgba(226, 232, 240, 0.8)",
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        titleColor: "rgba(34, 211, 238, 1)",
        bodyColor: "rgba(226, 232, 240, 1)",
        borderColor: "rgba(34, 211, 238, 0.5)",
        borderWidth: 1,
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
}