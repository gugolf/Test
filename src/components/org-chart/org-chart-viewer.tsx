'use client'

import React, { useState, useEffect } from 'react'
import Tree from 'react-d3-tree'
import { OrgNode, bulkCreateOrgProfiles, createSingleOrgProfile } from '@/app/actions/org-chart-actions'
import { Badge } from '@/components/ui/badge'
import { UserCheck, UserPlus, Focus, ZoomIn, ZoomOut, Plus, ExternalLink, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from "@/lib/utils"
import { CandidateAvatar } from '@/components/candidate-avatar'
import { CandidateLinkedinButton } from '@/components/candidate-linkedin-button'
import { getCheckedStatus } from '@/lib/candidate-utils'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

type OrgChartViewerProps = {
    initialData: OrgNode | null
}

// Custom Node Component
const NodeCard = ({ nodeDatum, toggleNode, onCreateProfile, isCreating }: any) => {
    const isMatch = !!nodeDatum.matched_candidate_id
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0

    // Prevent click propagation for links
    const handleLinkClick = (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    return (
        <g>
            <foreignObject width="300" height="180" x="-150" y="-90">
                <div className="p-2 h-full flex items-center justify-center">
                    <div
                        className={`
                  border rounded-xl shadow-md hover:shadow-xl transition-all duration-300
                  flex flex-col items-center p-4 text-center group
                  ${isMatch ? 'border-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 ring-1 ring-emerald-100' : 'border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95'}
                  ${hasChildren ? 'cursor-pointer' : ''}
                `}
                        onClick={hasChildren ? toggleNode : undefined}
                    >
                        {/* Status Indicator & LinkedIn */}
                        <div className="absolute top-3 right-3 flex gap-1.5 items-center">
                            {nodeDatum.linkedin && (
                                <div onClick={handleLinkClick}>
                                    <CandidateLinkedinButton
                                        checked={nodeDatum.checked || getCheckedStatus(nodeDatum.linkedin)}
                                        linkedin={nodeDatum.linkedin}
                                        candidateId={nodeDatum.candidate_id || `temp-${nodeDatum.node_id}`}
                                        className="h-6 w-6"
                                    />
                                </div>
                            )}

                            {isMatch ? (
                                <div className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 p-1 rounded-full border border-emerald-200" title="Matched Candidate">
                                    <UserCheck size={14} />
                                </div>
                            ) : (
                                <div className="text-slate-400 bg-slate-50 dark:bg-slate-800 p-1 rounded-full border border-slate-100 dark:border-slate-700" title="No Candidate Profile">
                                    <UserPlus size={14} />
                                </div>
                            )}
                        </div>

                        {/* External Link Action */}
                        {isMatch && nodeDatum.candidate_id && (
                            <Link
                                href={`/candidates/${nodeDatum.candidate_id}`}
                                target="_blank"
                                onClick={handleLinkClick}
                                className="absolute top-3 left-3 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                                <ExternalLink size={14} />
                            </Link>
                        )}

                        {/* Avatar */}
                        <div className="mb-3 relative">
                            <div className={`p-0.5 rounded-full border-2 ${isMatch ? 'border-emerald-200 bg-emerald-100' : 'border-slate-100 bg-slate-50 shadow-sm'}`}>
                                <CandidateAvatar
                                    src={nodeDatum.candidate_photo}
                                    name={nodeDatum.name}
                                    className="h-14 w-14"
                                />
                            </div>
                            {hasChildren && (
                                <Badge className="absolute -bottom-1 -right-1 px-1.5 py-0 h-5 text-[10px] bg-indigo-600 text-white border-white border-2">
                                    {nodeDatum.children.length}
                                </Badge>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">
                                {nodeDatum.name}
                            </h3>
                            {isMatch && nodeDatum.candidate_id && (
                                <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-0.5 mb-1">
                                    {nodeDatum.candidate_id}
                                </div>
                            )}
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold line-clamp-1 uppercase tracking-tight">
                                {nodeDatum.title || 'Position Not Set'}
                            </p>

                            {!isMatch && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] px-2 gap-1 border-dashed border-emerald-500 text-emerald-600 hover:bg-emerald-50 mt-3"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCreateProfile(nodeDatum.node_id);
                                    }}
                                    disabled={isCreating}
                                >
                                    {isCreating ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <UserPlus size={12} />
                                    )}
                                    Create Profile
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </foreignObject>
        </g>
    )
}

export function OrgChartViewer({ initialData }: OrgChartViewerProps) {
    const searchParams = useSearchParams()
    const uploadId = searchParams.get('id')
    const [translate, setTranslate] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(0.7)
    const [showLegend, setShowLegend] = useState(false)
    const [isBulkLoading, setIsBulkLoading] = useState(false)
    const [creatingNodes, setCreatingNodes] = useState<Set<string>>(new Set())
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Find all unmatched nodes for bulk creation
    const getUnmatchedNodes = (node: OrgNode | null): OrgNode[] => {
        if (!node) return []
        let results: OrgNode[] = []
        if (!node.matched_candidate_id && node.node_id !== 'root-wrapper') {
            results.push(node)
        }
        if (node.children) {
            node.children.forEach(child => {
                results = [...results, ...getUnmatchedNodes(child)]
            })
        }
        return results
    }

    const unmatchedCount = getUnmatchedNodes(initialData).length

    const handleBulkCreate = async () => {
        if (!uploadId) return
        try {
            setIsBulkLoading(true)
            const res = await bulkCreateOrgProfiles(uploadId as string)
            const msg = `Successfully created ${res.count} profiles! ${(res.webhookCount ?? 0) > 0 ? `${res.webhookCount} webhooks sent to n8n.` : ''}`
            toast.success(msg)
        } catch (err) {
            toast.error("Bulk creation failed. Check logs.")
        } finally {
            setIsBulkLoading(false)
        }
    }

    const handleSingleCreate = async (nodeId: string) => {
        try {
            setCreatingNodes(prev => new Set(prev).add(nodeId))
            const res = await createSingleOrgProfile(nodeId)
            if (res.mode === 'n8n') {
                toast.success("Profile created! Webhook sent to n8n for experience retrieval.")
            } else {
                toast.success("Profile and Current Job experience created successfully.")
            }
        } catch (err) {
            console.error('[CreateSingle] Error:', err)
            toast.error("Profile creation failed.")
        } finally {
            setCreatingNodes(prev => {
                const next = new Set(prev)
                next.delete(nodeId)
                return next
            })
        }
    }

    const centerChart = () => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect()
            setTranslate({ x: width / 2, y: height / 6 })
            setZoom(0.7)
        }
    }

    // Center tree on load
    useEffect(() => {
        centerChart()
    }, [initialData])

    if (!initialData) {
        return (
            <div className="h-[600px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50/50">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <UserPlus size={32} className="text-slate-300" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">No Chart Structure Found</p>
                <p className="text-sm mt-1">Select an organization or upload a PDF to see the structure.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full relative bg-slate-50/30 rounded-xl overflow-hidden border shadow-sm group">

            {/* Action Buttons (Top Right) */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                <div className="flex gap-2 items-center">
                    {/* Debug: {unmatchedCount} */}
                    <Button
                        variant="default"
                        size="sm"
                        className={cn(
                            "h-9 px-4 shadow-md rounded-full text-[11px] font-bold gap-2 transition-all border-none",
                            unmatchedCount > 0 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                        onClick={handleBulkCreate}
                        disabled={isBulkLoading || unmatchedCount === 0}
                    >
                        {isBulkLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Sparkles size={14} className={unmatchedCount > 0 ? "text-emerald-100" : "text-slate-300"} />
                        )}
                        CREATE ALL ({unmatchedCount})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLegend(!showLegend)}
                        className={cn(
                            "h-9 px-3 shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-full text-xs gap-2 transition-all",
                            showLegend ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-50"
                        )}
                        title="Toggle Legend"
                    >
                        <Plus size={14} className={cn("transition-transform", showLegend && "rotate-45")} />
                        CHART KEY
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={centerChart}
                        className="h-9 w-9 shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 rounded-full"
                        title="Recenter Chart"
                    >
                        <Focus size={16} className="text-slate-600" />
                    </Button>
                </div>

                {/* Legend Panel (Collapsible) */}
                {showLegend && (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur p-3 rounded-xl shadow-xl border border-indigo-100 dark:border-indigo-900/30 text-[10px] text-slate-500 space-y-2 w-52 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[9px] border-b pb-1 flex items-center justify-between">
                            <span>Legend & Help</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Internal Matched Profile</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-slate-300 ring-4 ring-slate-50 dark:ring-slate-800/20" />
                            <span className="font-medium text-slate-500">External / Unmatched Info</span>
                        </div>
                        <div className="pt-1.5 flex flex-col gap-1 border-t mt-1 opacity-70">
                            <div className="flex items-center gap-2 italic">
                                <ZoomIn size={12} /> Scroll to Zoom
                            </div>
                            <div className="flex items-center gap-2 italic">
                                <Focus size={12} /> Drag to Pan
                            </div>
                            <div className="flex items-center gap-2 italic">
                                <Plus size={12} /> Click Card to Expand Team
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tree Container */}
            <div ref={containerRef} className="w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]">
                <Tree
                    data={initialData}
                    translate={translate}
                    zoom={zoom}
                    renderCustomNodeElement={(rd3tProps) => (
                        <NodeCard
                            {...rd3tProps}
                            onCreateProfile={handleSingleCreate}
                            isCreating={creatingNodes.has((rd3tProps.nodeDatum as any).node_id)}
                        />
                    )}
                    orientation="vertical"
                    pathFunc="step"
                    separation={{ siblings: 1.5, nonSiblings: 2 }}
                    zoomable={true}
                    draggable={true}
                    collapsible={true}
                    nodeSize={{ x: 300, y: 220 }}
                    enableLegacyTransitions={true}
                    transitionDuration={400}
                    onUpdate={(target: any) => {
                        if (target.zoom !== zoom) setZoom(target.zoom)
                        if (target.translate.x !== translate.x || target.translate.y !== translate.y) {
                            setTranslate(target.translate)
                        }
                    }}
                />
            </div>
        </div>
    )
}
