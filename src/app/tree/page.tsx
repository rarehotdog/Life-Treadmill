'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Trophy, Flower2, Sprout, Apple, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import type { TechTreeNode } from '@/types';

// Custom node component
function TreeNode({ data }: { data: { label: string; status: string; type: string } }) {
  const statusConfig = {
    completed: {
      icon: Apple,
      className: 'tree-node-completed',
      iconColor: 'text-green-500',
      emoji: '🍎',
    },
    in_progress: {
      icon: Flower2,
      className: 'tree-node-in-progress',
      iconColor: 'text-yellow-500',
      emoji: '🌸',
    },
    pending: {
      icon: Sprout,
      className: 'tree-node-pending',
      iconColor: 'text-muted-foreground',
      emoji: '🌱',
    },
    locked: {
      icon: Sprout,
      className: 'tree-node-locked',
      iconColor: 'text-muted-foreground/50',
      emoji: '🔒',
    },
  };

  const config = statusConfig[data.status as keyof typeof statusConfig] || statusConfig.pending;
  const isRoot = data.type === 'root';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        px-4 py-3 rounded-xl min-w-[140px] max-w-[200px]
        ${config.className}
        ${isRoot ? 'min-w-[200px]' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.emoji}</span>
        <span className={`text-sm font-medium ${data.status === 'locked' ? 'text-muted-foreground/50' : ''}`}>
          {data.label}
        </span>
      </div>
      {isRoot && (
        <div className="flex items-center gap-1 mt-1">
          <Trophy className="w-3 h-3 text-yellow-500" />
          <span className="text-xs text-muted-foreground">최종 목표</span>
        </div>
      )}
    </motion.div>
  );
}

const nodeTypes = {
  treeNode: TreeNode,
};

export default function TreePage() {
  const router = useRouter();
  const { techTree, onboardingData } = useAppStore();

  // Convert tech tree to react-flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!techTree) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Helper function to process nodes recursively
    const processNode = (
      node: TechTreeNode,
      level: number,
      index: number,
      parentId: string | null,
      siblingCount: number
    ) => {
      const xBase = 400;
      const yBase = 80;
      const xSpacing = 220;
      const ySpacing = 120;

      // Calculate position
      const totalWidth = siblingCount * xSpacing;
      const startX = xBase - totalWidth / 2 + xSpacing / 2;
      const x = startX + index * xSpacing;
      const y = yBase + level * ySpacing;

      // Add node
      nodes.push({
        id: node.id,
        type: 'treeNode',
        position: { x, y },
        data: {
          label: node.title,
          status: node.status,
          type: level === 0 ? 'root' : 'child',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      // Add edge from parent
      if (parentId) {
        edges.push({
          id: `${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          type: 'smoothstep',
          animated: node.status === 'in_progress',
          style: {
            stroke: node.status === 'locked' ? 'hsl(var(--muted-foreground) / 0.3)' : 'hsl(var(--primary))',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: node.status === 'locked' ? 'hsl(var(--muted-foreground) / 0.3)' : 'hsl(var(--primary))',
          },
        });
      }

      // Process children
      if (node.children) {
        node.children.forEach((child, childIndex) => {
          processNode(child, level + 1, childIndex, node.id, node.children!.length);
        });
      }
    };

    // Start processing from root
    processNode(techTree.root, 0, 0, null, 1);

    return { initialNodes: nodes, initialEdges: edges };
  }, [techTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (!techTree) {
      router.push('/onboarding');
    }
  }, [techTree, router]);

  if (!techTree || !onboardingData) {
    return null;
  }

  // Count nodes by status
  const statusCounts = useMemo(() => {
    const counts = { completed: 0, in_progress: 0, pending: 0, locked: 0 };
    const countNodes = (node: TechTreeNode) => {
      counts[node.status as keyof typeof counts]++;
      node.children?.forEach(countNodes);
    };
    countNodes(techTree.root);
    return counts;
  }, [techTree]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              대시보드로
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                🍎 완료 {statusCounts.completed}
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                🌸 진행중 {statusCounts.in_progress}
              </Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                🌱 대기 {statusCounts.pending}
              </Badge>
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground/50">
                🔒 잠김 {statusCounts.locked}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="absolute top-20 left-0 right-0 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            {onboardingData.goal}
          </h1>
          <p className="text-muted-foreground">
            목표까지 {techTree.estimated_completion_date} • 하나씩 열매를 맺어가세요
          </p>
        </motion.div>
      </div>

      {/* React Flow */}
      <div className="h-screen w-full pt-32">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background color="hsl(var(--muted-foreground) / 0.1)" gap={20} />
          <Controls className="!bg-card !border-border !rounded-xl" />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="glass rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-medium mb-3">범례</h3>
          <div className="flex items-center gap-2 text-sm">
            <span>🍎</span>
            <span className="text-green-500">완료한 퀘스트</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>🌸</span>
            <span className="text-yellow-500">진행 중</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>🌱</span>
            <span className="text-muted-foreground">대기 중</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>🔒</span>
            <span className="text-muted-foreground/50">잠김 (선행 필요)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
