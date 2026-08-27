"use client";

import { useCallback, useState } from "react";
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

const handleStyle = { background: "#a3aeba", width: "12px", height: "12px", border: "2px solid white" };

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
  return <BaseNode data={data} type="action" icon={data.title?.includes("Finance") ? ShieldCheck : UserCog} />;
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
  const Icon = data.title?.includes("Drive") ? FolderOpen : data.title?.includes("PDF") ? FileText : Check;
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

export function WorkflowEditor({ definition, onChange }: any) {
  // Start with a clean canvas containing just one input node
  const initialNodes: Node[] = [
    { id: "1", type: "source", position: { x: 50, y: 50 }, data: { label: "INPUT SOURCE", title: "Trigger Event", description: "Start of workflow" } },
  ];
  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  const addStage = () => {
    const newNode: Node = {
      id: Date.now().toString(),
      type: "action",
      position: { x: 100, y: 100 },
      data: { label: "APPROVER ROLE", title: "New Stage", description: "Review request" },
    };
    setNodes((ns) => [...ns, newNode]);
  };
  
  const relayout = () => {
    const { nodes: layouted, edges: lEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layouted]);
    setEdges([...lEdges]);
  };

  const selectedNode = nodes.find((n) => n.selected);

  const updateSelectedNode = (field: string, value: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode?.id) {
          if (field === "type") {
            return { ...n, type: value };
          }
          return { ...n, data: { ...n.data, [field]: value } };
        }
        return n;
      })
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
  };

  return (
    <div style={{ width: "100%", height: "485px", border: "1px solid #e1e6eb", borderRadius: "11px", background: "white", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px", borderBottom: "1px solid #e1e6eb", display: "flex", gap: "10px", background: "#f8fafc", borderTopLeftRadius: "11px", borderTopRightRadius: "11px" }}>
        <button className="solid-button" onClick={addStage} style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "6px" }}>+ Add Stage</button>
        <button onClick={relayout} style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "6px", border: "1px solid #dfe5eb", background: "white" }}>Auto Layout</button>
        <span style={{ fontSize: "10px", color: "#87939f", alignSelf: "center", marginLeft: "auto" }}>Drag dots to connect nodes.</span>
      </div>
      
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        {/* Canvas Area */}
        <div style={{ flex: 1, position: "relative" }}>
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

        {/* Properties Sidebar */}
        {selectedNode && (
          <div style={{ width: "260px", borderLeft: "1px solid #e1e6eb", background: "#f8fafc", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
            <h3 style={{ fontSize: "12px", margin: 0, color: "#3d4b58", textTransform: "uppercase", letterSpacing: "0.05em" }}>Node Properties</h3>
            
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#5a6876" }}>
              Type
              <select 
                value={selectedNode.type} 
                onChange={(e) => updateSelectedNode("type", e.target.value)}
                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #dfe5eb", fontSize: "12px" }}
              >
                <option value="source">Input Source</option>
                <option value="action">Action / Approval</option>
                <option value="decision">Condition</option>
                <option value="output">Output</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#5a6876" }}>
              Label (Small uppercase)
              <input 
                type="text" 
                value={selectedNode.data.label as string} 
                onChange={(e) => updateSelectedNode("label", e.target.value)}
                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #dfe5eb", fontSize: "12px" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#5a6876" }}>
              Title
              <input 
                type="text" 
                value={selectedNode.data.title as string} 
                onChange={(e) => updateSelectedNode("title", e.target.value)}
                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #dfe5eb", fontSize: "12px", fontWeight: "bold" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#5a6876" }}>
              Description
              <textarea 
                value={selectedNode.data.description as string} 
                onChange={(e) => updateSelectedNode("description", e.target.value)}
                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #dfe5eb", fontSize: "12px", minHeight: "60px", resize: "none" }}
              />
            </label>

            <button 
              onClick={deleteSelectedNode}
              style={{ marginTop: "auto", padding: "8px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
            >
              Delete Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
