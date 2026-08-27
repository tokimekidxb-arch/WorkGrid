"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Check, FileInput, FileText, FolderOpen, GitBranch, ShieldCheck, UserCog } from "lucide-react";

// --- Custom Node Components ---

const handleStyle = { background: "#a3aeba", width: "8px", height: "8px", border: "2px solid white" };

function BaseNode({ data, type, icon: Icon, children }: any) {
  return (
    <div className={`flow-node ${type}`} style={{ width: "220px", display: "flex", flexDirection: "column", position: "relative" }}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Icon size={18} />
      <small>{data.label}</small>
      <strong>{data.title}</strong>
      <em>{data.description}</em>
      {children}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function SourceNode({ data }: any) {
  return <BaseNode data={data} type="source" icon={FileInput} />;
}

export function ActionNode({ data }: any) {
  return <BaseNode data={data} type="action" icon={data.title.includes("Finance") ? ShieldCheck : UserCog} />;
}

export function DecisionNode({ data }: any) {
  return (
    <BaseNode data={data} type="decision" icon={GitBranch}>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ ...handleStyle, left: "30%", background: "#2e9265" }} />
      <Handle type="source" position={Position.Bottom} id="no" style={{ ...handleStyle, left: "70%", background: "#c77428" }} />
    </BaseNode>
  );
}

export function OutputNode({ data }: any) {
  const Icon = data.title.includes("Drive") ? FolderOpen : data.title.includes("PDF") ? FileText : Check;
  return <BaseNode data={data} type="output" icon={Icon} />;
}

const nodeTypes = {
  source: SourceNode,
  action: ActionNode,
  decision: DecisionNode,
  output: OutputNode,
};

// --- Layout Engine ---

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 130;

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "TB") {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
}

// --- Main Editor Component ---

interface WorkflowEditorProps {
  definition: any;
  onChange?: (definition: any) => void;
}

export function WorkflowEditor({ definition, onChange }: WorkflowEditorProps) {
  // Convert definition to nodes and edges (simplified conversion for the visual editor)
  const initialNodes: Node[] = [
    { id: "1", type: "source", position: { x: 0, y: 0 }, data: { label: "INPUT SOURCE", title: "Purchase request form", description: "Submitted by: Requester role" } },
    { id: "2", type: "action", position: { x: 0, y: 0 }, data: { label: "APPROVER ROLE", title: "Department manager", description: "Can approve or reject" } },
    { id: "3", type: "decision", position: { x: 0, y: 0 }, data: { label: "ROUTING CONDITION", title: "Amount above AED 5,000?", description: "Yes → Finance · No → Complete" } },
    { id: "4", type: "action", position: { x: 0, y: 0 }, data: { label: "APPROVER ROLE", title: "Finance approver", description: "Can approve, reject, return" } },
    { id: "5", type: "output", position: { x: 0, y: 0 }, data: { label: "WORKFLOW STATUS", title: "Approved", description: "Lock final form values" } },
    { id: "6", type: "output", position: { x: 0, y: 0 }, data: { label: "GOOGLE DRIVE", title: "Save attachments", description: "Client-selected folder" } },
    { id: "7", type: "output", position: { x: 0, y: 0 }, data: { label: "FINAL OUTPUT", title: "Generate close PDF", description: "Save PDF and approval history" } },
  ];

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "1", target: "2", animated: true },
    { id: "e2-3", source: "2", target: "3", animated: true },
    { id: "e3-4", source: "3", sourceHandle: "yes", target: "4", animated: true, label: "YES" },
    { id: "e3-5", source: "3", sourceHandle: "no", target: "5", animated: true, label: "NO" },
    { id: "e4-6", source: "4", target: "6", animated: true },
    { id: "e5-6", source: "5", target: "6", animated: true },
    { id: "e6-7", source: "6", target: "7", animated: true },
  ];

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  const addStage = () => {
    const newNode: Node = {
      id: Date.now().toString(),
      type: "action",
      position: { x: 0, y: 0 },
      data: { label: "APPROVER ROLE", title: "New Stage", description: "Review request" },
    };
    setNodes((ns) => {
      const updatedNodes = [...ns, newNode];
      const { nodes: layouted } = getLayoutedElements(updatedNodes, edges);
      return layouted;
    });
  };
  
  const relayout = () => {
    const { nodes: layouted, edges: lEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layouted]);
    setEdges([...lEdges]);
  };

  return (
    <div style={{ width: "100%", minHeight: "485px", border: "1px solid #e1e6eb", borderRadius: "11px", background: "white", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px", borderBottom: "1px solid #e1e6eb", display: "flex", gap: "10px", background: "#f8fafc", borderTopLeftRadius: "11px", borderTopRightRadius: "11px" }}>
        <button className="solid-button" onClick={addStage} style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "6px" }}>+ Add Stage</button>
        <button onClick={relayout} style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "6px", border: "1px solid #dfe5eb", background: "white" }}>Auto Layout</button>
        <span style={{ fontSize: "10px", color: "#87939f", alignSelf: "center", marginLeft: "auto" }}>Drag to connect nodes. Select and press Backspace to delete.</span>
      </div>
      <div style={{ width: "100%", height: "440px", position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
