import React from 'react';
import type { AnalysisResult } from '../types';

interface AnalysisChartProps {
  results: AnalysisResult[];
  xAxisLabel: string;
  yAxisLabel: string;
  xDomain?: [number, number] | null;
  yDomain?: [number, number] | null;
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ results, xAxisLabel, yAxisLabel, xDomain, yDomain }) => {
  if (!results || results.length === 0 || results[0].data.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 flex items-center justify-center h-full">
        <p className="text-slate-500">No data to display.</p>
      </div>
    );
  }

  const data = results[0].data;
  const padding = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = 600;
  const height = 400;
  
  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);

  const [minX, maxX] = xDomain || [Math.min(...xValues), Math.max(...xValues)];
  const [minY, maxY] = yDomain || [Math.max(...yValues) > 0 ? Math.min(...yValues) : 0, Math.max(...yValues, 1)];

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xScale = (x: number) => padding.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const yScale = (y: number) => height - padding.bottom - ((y - minY) / (maxY - minY)) * plotHeight;
  
  const numTicks = 6;
  const yAxisTicks = Array.from({ length: numTicks }, (_, i) => minY + (i * (maxY - minY)) / (numTicks - 1));
  const xAxisTicks = Array.from({ length: numTicks }, (_, i) => minX + (i * (maxX - minX)) / (numTicks - 1));

  const pathData = data.map(d => `${xScale(d.x).toFixed(2)},${yScale(d.y).toFixed(2)}`).join(' L ');
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">Analysis Results</h2>
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="font-sans">
                {/* Y Axis */}
                <g className="text-xs text-slate-400">
                {yAxisTicks.map(tick => (
                    <g key={`y-tick-${tick}`} transform={`translate(0, ${yScale(tick)})`}>
                    <line x1={padding.left} x2={width - padding.right} stroke="#475569" strokeWidth="0.5" strokeDasharray="2 2" />
                    <text x={padding.left - 8} y="4" textAnchor="end" fill="#94a3b8">{tick.toFixed(1)}</text>
                    </g>
                ))}
                <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#64748b" />
                <text transform={`translate(${padding.left / 2 - 10}, ${height / 2}) rotate(-90)`} textAnchor="middle" fill="#cbd5e1" className="text-sm font-medium">{yAxisLabel}</text>
                </g>

                {/* X Axis */}
                <g className="text-xs text-slate-400">
                {xAxisTicks.map(tick => (
                    <g key={`x-tick-${tick}`} transform={`translate(${xScale(tick)}, 0)`}>
                    <text x="0" y={height - padding.bottom + 20} textAnchor="middle" fill="#94a3b8">
                        {Math.abs(tick) < 1 && Math.abs(tick) > 0 ? tick.toFixed(2) : tick.toFixed(0)}
                    </text>
                    </g>
                ))}
                <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#64748b" />
                <text x={width / 2} y={height - 10} textAnchor="middle" fill="#cbd5e1" className="text-sm font-medium">{xAxisLabel}</text>
                </g>

                {/* Line */}
                <path d={`M ${pathData}`} fill="none" stroke="#22d3ee" strokeWidth="2" />

                {/* Points */}
                {data.map(d => (
                    <circle key={`dot-${d.x}-${d.y}`} cx={xScale(d.x)} cy={yScale(d.y)} r="3" fill="#22d3ee" />
                ))}
            </svg>
        </div>
    </div>
  );
};

export default AnalysisChart;