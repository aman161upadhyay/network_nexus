"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface GraphNode {
  id: string;
  displayName: string;
  company?: string | null;
  personalScore: number;
  professionalScore: number;
  photoUrl?: string | null;
  isVip: boolean;
  x?: number;
  y?: number;
  val?: number;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: { source: string; target: string; weight?: number }[];
  onNodeClick?: (node: GraphNode) => void;
}

function scoreToColor(personal: number, professional: number, isVip: boolean): string {
  if (isVip) return "#f59e0b";
  const score = Math.max(personal, professional);
  if (score >= 80) return "#10b981";
  if (score >= 40) return "#3b82f6";
  if (score >= 20) return "#f97316";
  return "#6b7280";
}

export function NetworkGraph({ nodes, edges, onNodeClick }: NetworkGraphProps) {
  const fgRef = useRef<any>(null);
  const [ForceGraph2D, setForceGraph2D] = useState<any>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      setForceGraph2D(() => mod.default ?? mod);
    });
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge")?.strength(-120);
    }
  }, [ForceGraph2D]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    const score = Math.max(n.personalScore ?? 0, n.professionalScore ?? 0);
    const r = 4 + (score / 100) * 8;
    const color = scoreToColor(n.personalScore ?? 0, n.professionalScore ?? 0, n.isVip ?? false);

    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color + "40";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (globalScale > 1.2) {
      const label = (n.displayName ?? "").split(" ")[0];
      ctx.font = `${11 / globalScale}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(label, node.x, node.y + r + 10 / globalScale);
    }
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        No contacts yet. Connect an account to build your graph.
      </div>
    );
  }

  if (!ForceGraph2D) {
    return <div className="flex items-center justify-center h-full text-slate-600 text-sm">Loading graph…</div>;
  }

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={{ nodes, links: edges }}
      nodeId="id"
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => "replace"}
      linkColor={() => "rgba(255,255,255,0.05)"}
      linkWidth={1}
      backgroundColor="#080810"
      onNodeClick={(node: any) => onNodeClick?.(node as GraphNode)}
      enableNodeDrag
      enableZoomInteraction
      cooldownTicks={100}
    />
  );
}
