import React, { useMemo, useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import { Download } from "lucide-react";

interface DataPoint {
  name: string; // e.g., "2024", "2025"
  [key: string]: any;
}

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface D3LineChartProps {
  data: DataPoint[];
  series: SeriesConfig[];
  unit?: string;
  referenceValue?: number;
  referenceLabel?: string;
}

export default function D3LineChart({
  data,
  series,
  unit = "",
  referenceValue,
  referenceLabel = "Referência",
}: D3LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 220 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);

  // Loading and transition animation state
  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [data]);

  // Keep track of container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 200),
        height: Math.max(height, 220),
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const { width, height } = dimensions;
  const margin = { top: 35, right: 20, bottom: 35, left: 45 };

  // Calculate scales
  const { xScale, yScale, yTicks, xTicks, points, referenceY } = useMemo(() => {
    // X Scale: scalePoint maps individual years nicely
    const xValues = data.map((d) => d.name);
    const xScale = d3
      .scalePoint<string>()
      .domain(xValues)
      .range([margin.left, width - margin.right])
      .padding(0.4);

    // Y Scale: dynamically find min/max values across all active series
    const allValues: number[] = [];
    data.forEach((d) => {
      series.forEach((s) => {
        const val = d[s.key];
        if (typeof val === "number") {
          allValues.push(val);
        }
      });
    });

    if (referenceValue !== undefined) {
      allValues.push(referenceValue);
    }

    const maxVal = d3.max(allValues) ?? 100;
    const minVal = d3.min(allValues) ?? 0;

    // Give some padding at the top and bottom
    const yDomainMin = Math.min(0, minVal < 0 ? minVal * 1.2 : 0);
    const yDomainMax = maxVal * 1.2;

    const yScale = d3
      .scaleLinear()
      .domain([yDomainMin, yDomainMax])
      .range([height - margin.bottom, margin.top]);

    const yTicks = yScale.ticks(5);
    const xTicks = xValues;

    // Generate line points for each series
    const points = series.map((s) => {
      const lineGen = d3
        .line<DataPoint>()
        .x((d) => xScale(d.name) ?? 0)
        .y((d) => yScale(d[s.key] as number) ?? 0)
        .curve(d3.curveMonotoneX);

      const areaGen = d3
        .area<DataPoint>()
        .x((d) => xScale(d.name) ?? 0)
        .y0(yScale(0))
        .y1((d) => yScale(d[s.key] as number) ?? 0)
        .curve(d3.curveMonotoneX);

      const path = lineGen(data) ?? "";
      const areaPath = areaGen(data) ?? "";

      return {
        ...s,
        path,
        areaPath,
      };
    });

    const referenceY =
      referenceValue !== undefined ? yScale(referenceValue) : undefined;

    return {
      xScale,
      yScale,
      yTicks,
      xTicks,
      points,
      referenceY,
    };
  }, [data, series, width, height, referenceValue, margin.left, margin.right, margin.top, margin.bottom]);

  // Handle pointer interactions to find nearest data point
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find closest index
    const xValues = data.map((d) => xScale(d.name) ?? 0);
    let closestIdx = 0;
    let minDistance = Infinity;

    xValues.forEach((x, idx) => {
      const dist = Math.abs(x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);

    // Position tooltip beautifully based on closest item
    const tooltipX = xValues[closestIdx];
    setTooltipPos({
      x: tooltipX > width / 2 ? tooltipX - 160 : tooltipX + 15,
      y: Math.min(mouseY, height - 120),
    });
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
  };

  const handleSaveAsPng = () => {
    if (!svgRef.current) return;

    try {
      const svgElement = svgRef.current;
      
      // Get SVG dimensions
      const svgWidth = width;
      const svgHeight = height;

      // Serialize the SVG to a XML string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      // Create a blob from the XML string
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // Create an Image element to load the SVG
      const img = new Image();
      img.onload = () => {
        // Create canvas with 2x scale for high-DPI retina rendering
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = svgWidth * scale;
        canvas.height = (svgHeight + 35) * scale; // Add some height for legend space

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Enable high-quality scaling
        ctx.scale(scale, scale);

        // 1. Draw plain white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, svgWidth, svgHeight + 35);

        // 2. Draw SVG image
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

        // 3. Draw a gorgeous chart footer/legend in the exported PNG so it is completely self-contained!
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        
        // Print the chart title or legend labels
        const legendText = series.map(s => `${s.label}`).join("  |  ");
        ctx.fillText(legendText.toUpperCase(), svgWidth / 2, svgHeight + 14);

        // Draw a tiny branding stamp
        ctx.font = "normal 8px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("GERADO POR CONFIAAI", svgWidth / 2, svgHeight + 25);

        // Convert canvas to PNG data URL
        const pngUrl = canvas.toDataURL("image/png");

        // Create download link
        const downloadLink = document.createElement("a");
        // Filename based on series labels
        const chartName = series.map(s => s.key).join("-");
        const filename = `diagnostico-${chartName}.png`;
        downloadLink.href = pngUrl;
        downloadLink.download = filename;

        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up URL object
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (error) {
      console.error("Erro ao exportar gráfico para PNG:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[220px]"
      id={`d3-container-${series[0]?.key}`}
    >
      {/* Export PNG button absolutely positioned in the top-right */}
      <button
        onClick={handleSaveAsPng}
        className="absolute top-0 right-0 p-1 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-200/60 text-[9px] font-mono font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer z-20"
        title="Salvar Gráfico como PNG"
      >
        <Download className="w-2.5 h-2.5" />
        <span>PNG</span>
      </button>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible select-none cursor-crosshair"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <defs>
          {/* Ambient Area Gradients */}
          {series.map((s) => (
            <linearGradient
              key={`grad-${s.key}`}
              id={`gradient-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.0} />
            </linearGradient>
          ))}
        </defs>

        {/* Inner animated group wrapper for initial loading fade-in */}
        <g className={`transition-all duration-700 ease-in-out transform ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          
          {/* Horizontal grid lines */}
          <g className="grid-lines text-slate-100">
            {yTicks.map((tick, i) => (
              <line
                key={i}
                x1={margin.left}
                y1={yScale(tick)}
                x2={width - margin.right}
                y2={yScale(tick)}
                stroke="#f1f5f9"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? "none" : "3 3"}
                className="transition-all duration-700 ease-in-out"
              />
            ))}
          </g>

          {/* Reference Line */}
          {referenceValue !== undefined && referenceY !== undefined && (
            <g className="reference-line">
              <line
                x1={margin.left}
                y1={referenceY}
                x2={width - margin.right}
                y2={referenceY}
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                className="transition-all duration-700 ease-in-out"
              />
              <text
                x={width - margin.right - 4}
                y={referenceY - 6}
                fill="#94a3b8"
                fontFamily="sans-serif"
                fontSize="9"
                fontWeight="600"
                className="font-sans text-[9px] font-semibold text-right transition-all duration-700 ease-in-out"
                textAnchor="end"
              >
                {referenceLabel}: {referenceValue.toLocaleString("pt-BR")}{unit}
              </text>
            </g>
          )}

          {/* X Axis Ticks */}
          <g className="x-axis text-slate-400 font-mono text-[10px] font-bold">
            {xTicks.map((tick, i) => {
              const x = xScale(tick) ?? 0;
              return (
                <g key={i}>
                  <text
                    x={x}
                    y={height - margin.bottom + 18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontFamily="monospace"
                    fontSize="10"
                    fontWeight="500"
                    className="fill-slate-500 font-medium transition-all duration-700 ease-in-out"
                  >
                    {tick}
                  </text>
                  <circle cx={x} cy={height - margin.bottom} r={2} fill="#cbd5e1" className="transition-all duration-700 ease-in-out" />
                </g>
              );
            })}
            {/* Base X line */}
            <line
              x1={margin.left}
              y1={height - margin.bottom}
              x2={width - margin.right}
              y2={height - margin.bottom}
              stroke="#e2e8f0"
              strokeWidth={1}
              className="transition-all duration-700 ease-in-out"
            />
          </g>

          {/* Y Axis Ticks */}
          <g className="y-axis text-slate-400 font-mono text-[10px] font-bold">
            {yTicks.map((tick, i) => (
              <text
                key={i}
                x={margin.left - 10}
                y={yScale(tick) + 3}
                textAnchor="end"
                fill="#94a3b8"
                fontFamily="monospace"
                fontSize="10"
                fontWeight="500"
                className="fill-slate-400 font-medium transition-all duration-700 ease-in-out"
              >
                {tick.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}{unit}
              </text>
            ))}
          </g>

          {/* Render series lines & areas with smooth transition properties */}
          {points.map((p) => (
            <g key={`series-${p.key}`}>
              {/* Ambient shadow area */}
              <path
                d={p.areaPath}
                fill={`url(#gradient-${p.key})`}
                className="transition-all duration-700 ease-in-out"
              />
              {/* Vibrant Line with custom animation effects */}
              <path
                d={p.path}
                fill="none"
                stroke={p.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-700 ease-in-out"
              />
            </g>
          ))}

        </g>

        {/* Interactive Vertical Ruler & Highlight Dots */}
        {hoveredIndex !== null && (
          <g className="hover-elements">
            {/* Vertical Guide */}
            <line
              x1={xScale(data[hoveredIndex].name) ?? 0}
              y1={margin.top}
              x2={xScale(data[hoveredIndex].name) ?? 0}
              y2={height - margin.bottom}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="2 2"
              className="pointer-events-none"
            />

            {/* Pulsing indicator dots */}
            {series.map((s) => {
              const x = xScale(data[hoveredIndex].name) ?? 0;
              const y = yScale(data[hoveredIndex][s.key] as number) ?? 0;
              return (
                <g key={`pulse-${s.key}`} className="pointer-events-none">
                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill={s.color}
                    opacity={0.25}
                    className="animate-ping"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={4}
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="shadow-sm"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Static dots for values if no hover */}
        {hoveredIndex === null &&
          data.map((d, dIdx) => {
            const x = xScale(d.name) ?? 0;
            return series.map((s) => {
              const y = yScale(d[s.key] as number) ?? 0;
              return (
                <circle
                  key={`dot-${s.key}-${dIdx}`}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="#ffffff"
                  stroke={s.color}
                  strokeWidth={2}
                  className="pointer-events-none"
                />
              );
            });
          })}
      </svg>

      {/* Floating Hover HTML Tooltip */}
      {hoveredIndex !== null && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
          className="bg-slate-900/95 text-white p-3 rounded-lg border border-slate-700/80 shadow-lg text-[11px] font-sans w-[145px] pointer-events-none z-50 animate-in fade-in duration-100"
          id={`d3-tooltip-${series[0]?.key}`}
        >
          <div className="font-bold border-b border-slate-700 pb-1.5 mb-1.5 font-mono text-xs flex items-center justify-between">
            <span>Ano {data[hoveredIndex].name}</span>
            <span className="text-[10px] text-slate-400 font-normal">Filtro</span>
          </div>
          <div className="space-y-1.5">
            {series.map((s) => {
              const val = data[hoveredIndex][s.key] as number;
              return (
                <div key={s.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    ></span>
                    <span className="text-slate-300 font-medium truncate max-w-[70px]">
                      {s.label}
                    </span>
                  </div>
                  <span className="font-bold font-mono">
                    {val.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                    {unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Embedded Chart Legend */}
      <div className="flex items-center justify-center flex-wrap gap-4 mt-2">
        {series.map((s) => (
          <div key={`legend-${s.key}`} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: s.color }}
            ></span>
            <span className="text-[10px] font-semibold text-slate-500 font-mono uppercase">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
