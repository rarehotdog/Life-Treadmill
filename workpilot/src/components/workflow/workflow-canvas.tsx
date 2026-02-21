'use client';

import { useId, useMemo } from 'react';

import { cn } from '@/lib/utils';

export type WorkflowMapNode = {
  id: string;
  label: string;
  caption?: string;
  x: number;
  y: number;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted' | 'active' | 'success' | 'warning' | 'info';
  pulse?: boolean;
  interactive?: boolean;
};

export type WorkflowMapEdge = {
  from: string;
  to: string;
  highlighted?: boolean;
  dashed?: boolean;
};

const toneClassMap: Record<NonNullable<WorkflowMapNode['tone']>, string> = {
  default: 'border-slate-600/80 bg-slate-900/75 text-slate-200',
  muted: 'border-slate-700/80 bg-slate-900/45 text-slate-400',
  active: 'border-sky-400/70 bg-sky-500/20 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.26)]',
  success: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.26)]',
  warning: 'border-amber-300/75 bg-amber-500/20 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.24)]',
  info: 'border-indigo-300/70 bg-indigo-500/20 text-indigo-100 shadow-[0_0_18px_rgba(99,102,241,0.24)]'
};

const sizeClassMap: Record<NonNullable<WorkflowMapNode['size']>, string> = {
  sm: 'w-[120px] min-h-[50px]',
  md: 'w-[144px] min-h-[58px]',
  lg: 'w-[176px] min-h-[66px]'
};

type WorkflowCanvasProps = {
  nodes: WorkflowMapNode[];
  edges: WorkflowMapEdge[];
  className?: string;
  minHeightClassName?: string;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
};

export function WorkflowCanvas({
  nodes,
  edges,
  className,
  minHeightClassName = 'min-h-[360px]',
  selectedNodeId,
  onNodeClick
}: WorkflowCanvasProps) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const markerDefault = `${safeId}-arrow-default`;
  const markerActive = `${safeId}-arrow-active`;

  const nodeById = useMemo(() => {
    const mapped = new Map<string, WorkflowMapNode>();
    nodes.forEach((node) => {
      mapped.set(node.id, node);
    });
    return mapped;
  }, [nodes]);

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border bg-slate-950/60', className)}>
      <div className={cn('relative min-w-[680px] overflow-hidden', minHeightClassName)}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 10%, rgba(56,189,248,0.2), transparent 42%), radial-gradient(circle at 80% 90%, rgba(99,102,241,0.22), transparent 42%), linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 100% 100%, 28px 28px, 28px 28px'
          }}
        />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <marker id={markerDefault} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
            <marker id={markerActive} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {edges.map((edge, index) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;

            const controlX = (from.x + to.x) / 2;
            const controlY = (from.y + to.y) / 2 + (Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? 3 : 0);
            const d = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
            const stroke = edge.highlighted ? '#38bdf8' : '#475569';

            return (
              <path
                key={`${edge.from}-${edge.to}-${index}`}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={edge.highlighted ? 0.7 : 0.45}
                strokeOpacity={edge.highlighted ? 0.9 : 0.75}
                strokeDasharray={edge.dashed ? '1.2 1.1' : undefined}
                markerEnd={`url(#${edge.highlighted ? markerActive : markerDefault})`}
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const tone = node.tone || 'default';
          const size = node.size || 'md';
          const isSelected = selectedNodeId === node.id;
          const isClickable = Boolean(onNodeClick && node.interactive);
          const contentClassName = cn(
            'rounded-lg border px-3 py-2 text-center backdrop-blur-sm transition',
            toneClassMap[tone],
            sizeClassMap[size],
            node.pulse ? 'animate-pulse' : null,
            isSelected ? 'ring-2 ring-sky-300/70 ring-offset-2 ring-offset-slate-950' : null,
            isClickable ? 'cursor-pointer hover:border-sky-300/70 hover:text-sky-50' : null
          );

          const content = (
            <>
              <p className="text-[11px] font-semibold leading-tight">{node.label}</p>
              {node.caption ? <p className="mt-1 text-[10px] text-current/80">{node.caption}</p> : null}
            </>
          );

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {isClickable ? (
                <button type="button" className={contentClassName} onClick={() => onNodeClick?.(node.id)}>
                  {content}
                </button>
              ) : (
                <div className={contentClassName}>{content}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
