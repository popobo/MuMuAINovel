'use client'

import { useState } from 'react'
import { Network, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RelationshipGraph } from '@/components/relationships/relationship-graph'
import { RelationshipList } from '@/components/relationships/relationship-list'
import type { Node, Edge } from '@xyflow/react'

interface RelationshipsWorkspaceProps {
  projectId: string
  initialNodes: Node[]
  initialEdges: Edge[]
  editable?: boolean
}

export function RelationshipsWorkspace({
  projectId,
  initialNodes,
  initialEdges,
  editable = true,
}: RelationshipsWorkspaceProps) {
  const [mode, setMode] = useState<'graph' | 'list'>('graph')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">查看方式</span>
        <Button
          type="button"
          variant={mode === 'graph' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => setMode('graph')}
        >
          <Network className="h-4 w-4" aria-hidden />
          关系图谱
        </Button>
        <Button
          type="button"
          variant={mode === 'list' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => setMode('list')}
        >
          <List className="h-4 w-4" aria-hidden />
          关系列表
        </Button>
        <p className="text-xs text-muted-foreground ml-1 max-w-md">
          图谱适合总览；列表逐条阅读更清晰，可删除关系。
        </p>
      </div>

      {mode === 'graph' ? (
        <RelationshipGraph
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          editable={editable}
        />
      ) : (
        <div className="min-h-[calc(100vh-16rem)] overflow-auto rounded-lg border bg-card p-4">
          <RelationshipList projectId={projectId} />
        </div>
      )}
    </div>
  )
}
