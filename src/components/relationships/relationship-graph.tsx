'use client'

import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, Save } from 'lucide-react'
import { applyDagreLayout } from '@/lib/layout-relationship-graph'

interface CharacterNode extends Node {
  data: {
    label: string
    role?: string
    avatar?: string
  }
}

interface RelationshipEdge extends Edge {
  label?: string
  data?: {
    type: string
    description?: string | null
    strength: number
  }
}

interface RelationshipGraphProps {
  initialNodes: CharacterNode[]
  initialEdges: RelationshipEdge[]
  onSave?: (nodes: Node[], edges: Edge[]) => void
  editable?: boolean
}

type CharacterNodeData = CharacterNode['data']

// Custom nodes must expose Handle so React Flow can compute edge paths (@xyflow/react v12).
function CharacterNode({ data }: NodeProps<Node<CharacterNodeData>>) {
  return (
    <div className="relative px-4 py-3 shadow-md rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 min-w-[150px]">
      <Handle
        type="target"
        position={Position.Left}
        className="h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!"
      />
      <div className="flex items-center gap-3">
        {data.avatar ? (
          <img
            src={data.avatar}
            alt={data.label}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
            {data.label.charAt(0)}
          </div>
        )}
        <div>
          <div className="font-semibold text-sm">{data.label}</div>
          {data.role && (
            <div className="text-xs text-gray-500">{data.role}</div>
          )}
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  character: CharacterNode,
}

function FitViewOnLayout({
  layoutKey,
}: {
  layoutKey: string
}) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 220, maxZoom: 1.25 })
    })
    return () => cancelAnimationFrame(id)
  }, [layoutKey, fitView])
  return null
}

export function RelationshipGraph({
  initialNodes,
  initialEdges,
  onSave,
  editable = true,
}: RelationshipGraphProps) {
  const layoutedNodes = useMemo(
    () => applyDagreLayout(initialNodes, initialEdges),
    [initialNodes, initialEdges],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(applyDagreLayout(initialNodes, initialEdges))
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Refit when server-provided graph changes, not when the user adds a temporary edge in-session.
  const layoutKey = useMemo(
    () =>
      `${initialNodes.map((n) => n.id).join(',')}|${initialEdges.map((e) => e.id).join(',')}`,
    [initialNodes, initialEdges],
  )

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => {
        const next = addEdge(params, eds)
        const newEdge = next[next.length - 1]
        if (!newEdge || next.length <= eds.length) {
          return next as RelationshipEdge[]
        }
        return [
          ...next.slice(0, -1).map((e) => e as RelationshipEdge),
          {
            ...newEdge,
            label: 'related',
            data: { type: 'related', strength: 50 },
          },
        ]
      }),
    [setEdges],
  )

  // Add new character node
  function addCharacterNode() {
    const newNode: CharacterNode = {
      id: `char-${Date.now()}`,
      type: 'character',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label: 'New Character',
        role: 'Unknown',
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  // Save graph
  function handleSave() {
    if (onSave) {
      onSave(nodes, edges)
    }
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-gray-50 dark:bg-gray-900 rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        attributionPosition="bottom-left"
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        defaultEdgeOptions={{
          type: 'default',
          style: {
            stroke: 'var(--foreground)',
            strokeWidth: 1.75,
            opacity: 0.38,
          },
          labelStyle: {
            fill: 'var(--foreground)',
            fontSize: 11,
            fontWeight: 600,
          },
          labelShowBg: true,
          labelBgPadding: [6, 10] as [number, number],
          labelBgStyle: {
            fill: 'var(--card)',
            stroke: 'var(--border)',
            strokeWidth: 1,
          },
          labelBgBorderRadius: 6,
        }}
      >
        <FitViewOnLayout layoutKey={layoutKey} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => '#3b82f6'}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {editable && (
            <Button size="sm" onClick={addCharacterNode}>
              <Plus className="h-4 w-4 mr-2" />
              Add Character
            </Button>
          )}
          <Button size="sm" onClick={handleSave} variant="default">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Info Panel */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs border">
          <h3 className="font-semibold mb-2">Character Relationships</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>• Nodes: {nodes.length} characters</div>
            <div>• Edges: {edges.length} relationships</div>
            {editable && (
              <div className="mt-2 text-xs">
                Drag nodes to reposition
                <br />
                Connect nodes to create relationships
              </div>
            )}
          </div>
        </div>
      </ReactFlow>
    </div>
  )
}
