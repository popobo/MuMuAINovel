'use client'

import React, { useCallback, useMemo } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, Save, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface CharacterNode extends Node {
  data: {
    label: string
    role?: string
    avatar?: string
  }
}

interface RelationshipEdge extends Edge {
  label: string
  data: {
    type: string
    description?: string
    strength: number
  }
}

interface RelationshipGraphProps {
  initialNodes: CharacterNode[]
  initialEdges: RelationshipEdge[]
  onSave?: (nodes: Node[], edges: Edge[]) => void
  editable?: boolean
}

// Custom node component
function CharacterNode({ data }: { data: CharacterNode['data'] }) {
  return (
    <div className="px-4 py-3 shadow-md rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 min-w-[150px]">
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

export function RelationshipGraph({
  initialNodes,
  initialEdges,
  onSave,
  editable = true,
}: RelationshipGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, label: 'related' }, eds)),
    [setEdges]
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

  // Fit view
  function fitView() {
    // Implement fit view logic
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
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return '#3b82f6'
          }}
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
