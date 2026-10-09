import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ComponentScoresChartProps {
  // Coincide con RiskDetector.WEIGHTS: los 5 componentes reales de la
  // formula ponderada de riesgo (ver marco teorico de la tesis).
  data: {
    cyclomatic_complexity: number;
    code_churn: number;
    lines_of_code: number;
    code_duplication: number;
    bus_factor: number;
  };
}

export default function ComponentScoresChart({
  data,
}: ComponentScoresChartProps) {
  const chartData = {
    labels: [
      "Complejidad Ciclomática",
      "Code Churn",
      "Líneas de Código",
      "Duplicación",
      "Bus Factor",
    ],
    datasets: [
      {
        label: "Puntuación (0-100)",
        data: [
          data.cyclomatic_complexity,
          data.code_churn,
          data.lines_of_code,
          data.code_duplication,
          data.bus_factor,
        ],
        backgroundColor: "rgba(34, 211, 238, 0.6)",
        borderColor: "rgba(34, 211, 238, 1)",
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "rgba(226, 232, 240, 0.8)",
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
    scales: {
      x: {
        max: 100,
        ticks: {
          color: "rgba(226, 232, 240, 0.6)",
        },
        grid: {
          color: "rgba(34, 211, 238, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "rgba(226, 232, 240, 0.8)",
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}