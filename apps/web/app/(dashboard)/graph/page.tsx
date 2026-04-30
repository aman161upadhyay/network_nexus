"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { RelationshipRing } from "@/components/shared/relationship-ring";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";
import Link from "next/link";

// react-force-graph-2d uses browser APIs, must be client-only
const NetworkGraph = dynamic(
  () => import("@/components/graph/network-graph").then((m) => m.NetworkGraph),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Loading graph…</div> }
);

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { data } = trpc.contacts.networkGraph.useQuery();

  const nodes = (data?.nodes ?? []).map((n) => ({
    ...n,
    val: Math.max(n.personalScore, n.professionalScore) / 10 || 1,
  }));

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Network Graph" />

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-white/5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Strong (80+)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Active (40–79)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Cooling (20–39)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> VIP</span>
        <span className="text-slate-600 ml-auto">Node size = relationship strength</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <NetworkGraph
            nodes={nodes}
            edges={data?.edges ?? []}
            onNodeClick={(node) => setSelectedNode(node)}
          />
        </div>

        {/* Side panel on node click */}
        {selectedNode && (
          <div className="w-72 border-l border-white/5 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Contact</h3>
              <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center mb-4">
              <RelationshipRing
                personalScore={selectedNode.personalScore}
                professionalScore={selectedNode.professionalScore}
                displayName={selectedNode.displayName}
                photoUrl={selectedNode.photoUrl}
                size={64}
              />
              <h4 className="text-white font-medium mt-3">{selectedNode.displayName}</h4>
              {selectedNode.company && <p className="text-slate-500 text-sm">{selectedNode.company}</p>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Personal</span>
                <span className="text-green-400 font-medium">{selectedNode.personalScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Professional</span>
                <span className="text-blue-400 font-medium">{selectedNode.professionalScore}</span>
              </div>
            </div>
            <Link
              href={`/contacts/${selectedNode.id}`}
              className="mt-4 block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
            >
              View profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
