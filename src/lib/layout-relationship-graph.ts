import dagre from 'dagre'
import { Position, type Edge, type Node } from '@xyflow/react'

/** Approximate size of character cards in the graph (must match visual node roughly). */
const NODE_WIDTH = 200
const NODE_HEIGHT = 92

/**
 * Layered left→right layout so edges don’t all stack on a fixed grid.
 * Caller runs on the client after loading graph JSON.
 */
export function applyDagreLayout<N extends Node>(nodes: N[], edges: Edge[]): N[] {
  if (nodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',
    align: 'UL',
    nodesep: 56,
    ranksep: 96,
    marginx: 32,
    marginy: 32,
    acyclicer: 'greedy',
    ranker: 'network-simplex',
  })

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const withPos = g.node(node.id)
    if (!withPos || typeof withPos.x !== 'number') {
      return node
    }
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: withPos.x - NODE_WIDTH / 2,
        y: withPos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
