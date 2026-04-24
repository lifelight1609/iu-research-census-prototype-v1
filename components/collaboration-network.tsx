"use client"

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, RotateCcw, Sparkles, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { CollaborationGraphData, CollaborationNode } from '@/lib/collaboration-network'

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading collaboration graph...
      </div>
    ),
  }
) as any

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!ref.current) return

    const element = ref.current
    const update = () => {
      const rect = element.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return { ref, size }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawResearcherIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  background: string,
  stroke: string,
  isHighlighted: boolean
) {
  const half = size / 2
  const iconPadding = Math.max(size * 0.16, 1.5)
  const iconColor = '#ffffff'

  ctx.save()
  ctx.translate(x, y)

  ctx.shadowColor = isHighlighted ? 'rgba(124, 58, 237, 0.25)' : 'rgba(15, 23, 42, 0.08)'
  ctx.shadowBlur = isHighlighted ? size * 0.18 : size * 0.08
  ctx.shadowOffsetY = 1

  drawRoundedRect(ctx, -half, -half, size, size, Math.max(size * 0.22, 3))
  ctx.fillStyle = background
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = isHighlighted ? Math.max(2, size * 0.08) : Math.max(1, size * 0.05)
  ctx.strokeStyle = stroke
  ctx.stroke()

  const headRadius = Math.max(size * 0.16, 2.4)
  const headY = -size * 0.1
  const bodyWidth = size - iconPadding * 3
  const bodyHeight = size * 0.34
  const bodyTop = size * 0.08

  ctx.fillStyle = iconColor
  ctx.beginPath()
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2)
  ctx.fill()

  drawRoundedRect(ctx, -bodyWidth / 2, bodyTop, bodyWidth, bodyHeight, Math.max(bodyHeight * 0.35, 2))
  ctx.fill()

  ctx.restore()
}

export default function CollaborationNetwork({
  graph,
  researcherName,
}: {
  graph: CollaborationGraphData
  researcherName: string
}) {
  const router = useRouter()
  const graphRef = useRef<any>(null)
  const { ref, size } = useElementSize<HTMLDivElement>()
  const [hoveredNode, setHoveredNode] = useState<CollaborationNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<CollaborationNode | null>(null)

  const nodes = useMemo(() => graph.nodes.map((node) => ({ ...node })), [graph.nodes])
  const links = useMemo(() => graph.links.map((link) => ({ ...link })), [graph.links])
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links])
  const enableNodeDrag = nodes.length <= 220

  useEffect(() => {
    setSelectedNode(graph.nodes.find((node) => node.kind === 'seed') ?? graph.nodes[0] ?? null)
    setHoveredNode(null)
  }, [graph])

  const rootNode = useMemo(() => graph.nodes.find((node) => node.kind === 'seed') ?? graph.nodes[0] ?? null, [graph])
  const activeNode = hoveredNode ?? selectedNode ?? rootNode

  const handleNodeClick = (node: CollaborationNode) => {
    setSelectedNode(node)
    if (node.researcherId !== undefined && node.kind !== 'collaborator') {
      router.push(`/researcher/${node.researcherId}`)
    }
  }

  const zoomBy = (factor: number) => {
    const graphInstance = graphRef.current
    if (!graphInstance) return
    const currentZoom = typeof graphInstance.zoom === 'function' ? graphInstance.zoom() : 1
    if (typeof graphInstance.zoom === 'function') {
      graphInstance.zoom(Math.max(0.2, Math.min(8, currentZoom * factor)), 300)
    }
  }

  const fitGraph = () => {
    graphRef.current?.zoomToFit?.(350, 42)
  }

  const resetGraph = () => {
    fitGraph()
    setSelectedNode(rootNode)
  }

  const nodeColor = (node: CollaborationNode) => {
    if (node.kind === 'seed') return '#7c3aed'
    if (node.kind === 'researcher') return '#6b7f9b'
    return '#94a3b8'
  }

  const nodeStroke = (node: CollaborationNode, isHover: boolean) => {
    if (node.kind === 'seed') return isHover ? '#ede9fe' : '#f5f3ff'
    if (isHover) return '#ffffff'
    return 'rgba(15, 23, 42, 0.14)'
  }

  const nodeSize = (node: CollaborationNode, globalScale: number) => {
    const base = node.kind === 'seed' ? 28 : node.kind === 'researcher' ? 18 : 14
    const minSize = node.kind === 'seed' ? 20 : node.kind === 'researcher' ? 14 : 12
    return Math.max(minSize, base / globalScale)
  }

  return (
    <Card className="overflow-hidden border border-border/70 shadow-sm">
      <CardContent className="p-0">
        <div className="border-b bg-muted/20 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Collaboration network
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                {researcherName}'s publication network
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Drag to rearrange, scroll to zoom, and click any researcher node to open that profile.
                Collaborators who appear in the same publication are also linked to each other.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => zoomBy(1.15)}>
                <Plus className="h-4 w-4" />
                Zoom in
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => zoomBy(0.87)}>
                <Minus className="h-4 w-4" />
                Zoom out
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={fitGraph}>
                <Maximize2 className="h-4 w-4" />
                Fit
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={resetGraph}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="min-h-[640px] h-[76vh] max-h-[860px] bg-background" ref={ref}>
            {size.width > 0 && size.height > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={size.width}
                height={size.height}
                backgroundColor="rgba(0,0,0,0)"
                nodeRelSize={3}
                nodeCanvasObjectMode={() => 'replace'}
                cooldownTicks={60}
                warmupTicks={30}
                enableNodeDrag={enableNodeDrag}
                enableZoomInteraction
                enablePanInteraction
                linkOpacity={0.3}
                linkWidth={(link: any) => Math.max(0.75, Math.min(3.25, Math.sqrt(link.weight ?? 1)))}
                linkColor={() => 'rgba(148, 163, 184, 0.42)'}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const label = node.label || node.id
                  const isHover = hoveredNode?.id === node.id
                  const isRoot = node.kind === 'seed'
                  const isSelected = selectedNode?.id === node.id
                  const sizePx = nodeSize(node, globalScale)
                  const labelFont = Math.max(10, 12 / globalScale)
                  const shouldShowLabel = isRoot || isHover || isSelected

                  drawResearcherIcon(
                    ctx,
                    node.x,
                    node.y,
                    sizePx,
                    nodeColor(node),
                    nodeStroke(node, isHover || isSelected),
                    isHover || isRoot || isSelected
                  )

                  if (shouldShowLabel) {
                    const textX = node.x + sizePx / 2 + 6 / globalScale
                    const textY = node.y + 3 / globalScale
                    ctx.font = `${isRoot || isSelected ? '600' : '500'} ${labelFont}px Inter, ui-sans-serif, system-ui, sans-serif`
                    ctx.textBaseline = 'middle'
                    ctx.fillStyle = isRoot ? '#0f172a' : '#1e293b'
                    ctx.fillText(label, textX, textY)
                  }
                }}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                  const sizePx = nodeSize(node, 1)
                  ctx.fillStyle = color
                  drawRoundedRect(ctx, node.x - sizePx / 2 - 4, node.y - sizePx / 2 - 4, sizePx + 8, sizePx + 8, 6)
                  ctx.fill()
                }}
                onNodeClick={(node: any) => handleNodeClick(node as CollaborationNode)}
                onNodeHover={(node: any | null) => setHoveredNode((node as CollaborationNode) ?? null)}
                onBackgroundClick={() => setSelectedNode(rootNode)}
                onEngineStop={fitGraph}
              />
            )}
          </div>

          <div className="border-t bg-muted/10 p-5 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Graph summary</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Researchers" value={graph.stats.researchNodes} />
                  <Stat label="Collaborators" value={graph.stats.collaboratorNodes} />
                  <Stat label="Links" value={graph.stats.linkCount} />
                  <Stat label="Publications" value={graph.stats.publicationCount} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Legend</h3>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <LegendItem color="#7c3aed" label="Selected researcher" />
                  <LegendItem color="#6b7f9b" label="Other researchers" />
                  <LegendItem color="#94a3b8" label="External collaborators" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hovered node</h3>
                {activeNode ? (
                  <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{activeNode.label}</p>
                        <p className="text-sm text-muted-foreground capitalize">{activeNode.kind}</p>
                      </div>
                      {activeNode.researcherId !== undefined && activeNode.kind !== 'collaborator' ? (
                        <Badge variant="secondary">Researcher</Badge>
                      ) : (
                        <Badge variant="outline">Collaborator</Badge>
                      )}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <p>Connections: {activeNode.degree ?? 0}</p>
                      <p>Publications: {activeNode.publicationCount ?? 0}</p>
                      <p>Level: {activeNode.level ?? 0}</p>
                    </div>
                    {activeNode.researcherId !== undefined && activeNode.kind !== 'collaborator' && (
                      <Button
                        className="mt-4 w-full"
                        onClick={() => router.push(`/researcher/${activeNode.researcherId}`)}
                      >
                        Open researcher profile
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
                    Hover over a node to see its details.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <UserRound className="h-4 w-4" />
                  Display style
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nodes are intentionally compact so the researcher icons stay readable even when many coauthors
                  appear in the same publication.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
