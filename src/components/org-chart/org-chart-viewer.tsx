'use client'

import React, { useState, useEffect } from 'react'
import Tree from 'react-d3-tree'
import { OrgNode } from '@/app/actions/org-chart-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserCheck, UserPlus, Focus, ZoomIn, ZoomOut, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type OrgChartViewerProps = {
    initialData: OrgNode | null
}

// Custom Node Component
const NodeCard = ({ nodeDatum, toggleNode }: any) => {
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
                  relative w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
                  border rounded-xl shadow-md hover:shadow-xl transition-all duration-300
                  flex flex-col items-center p-4 text-center group
                  ${isMatch ? 'border-indigo-400/50 dark:border-indigo-500/50 ring-1 ring-indigo-50/50' : 'border-slate-200 dark:border-slate-700'}
                  ${hasChildren ? 'cursor-pointer' : ''}
                `}
                        onClick={hasChildren ? toggleNode : undefined}
                    >
                        {/* Status Indicator */}
                        <div className="absolute top-3 right-3">
                            {isMatch ? (
                                <div className="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 p-1 rounded-full border border-indigo-100 dark:border-indigo-800" title="Matched Candidate">
                                    <UserCheck size={14} />
                                </div>
                            ) : (
                                <div className="text-slate-400 bg-slate-50 dark:bg-slate-800 p-1 rounded-full border border-slate-100 dark:border-slate-700" title="No Candidate Profile">
                                    <UserPlus size={14} />
                                </div>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="mb-3 relative">
                            <div className={`p-0.5 rounded-full border-2 ${isMatch ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50 shadow-sm'}`}>
                                <Avatar className="h-14 w-14">
                                    <AvatarImage src={nodeDatum.candidate_photo || undefined} />
                                    <AvatarFallback className={`${isMatch ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {nodeDatum.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            {hasChildren && (
                                <Badge className="absolute -bottom-1 -right-1 px-1.5 py-0 h-5 text-[10px] bg-indigo-600 text-white border-white border-2">
                                    {nodeDatum.children.length}
                                </Badge>
                            )}
                        </div>

                        {/* Info */}
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1 mb-0.5">
                            {nodeDatum.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold line-clamp-1 mb-2 uppercase tracking-tight">
                            {nodeDatum.title || 'Position Not Set'}
                        </p>

                        {/* Action Link */}
                        {isMatch && nodeDatum.candidate_id && (
                            <Link
                                href={`/candidates/${nodeDatum.candidate_id}`}
                                target="_blank"
                                onClick={handleLinkClick}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                VIEW FULL PROFILE
                            </Link>
                        )}
                    </div>
                </div>
            </foreignObject>
        </g>
    )
}

export function OrgChartViewer({ initialData }: OrgChartViewerProps) {
    const [translate, setTranslate] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(0.7)
    const containerRef = React.useRef<HTMLDivElement>(null)

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

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={centerChart}
                    className="h-10 w-10 shadow-lg border-slate-200 bg-white hover:bg-slate-50 rounded-full"
                    title="Recenter Chart"
                >
                    <Focus size={18} className="text-slate-600" />
                </Button>
            </div>

            {/* Legend / Help */}
            <div className="absolute bottom-6 left-6 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-4 rounded-xl shadow-xl border text-[11px] text-slate-500 space-y-2.5 min-w-[180px] border-indigo-100 dark:border-indigo-900/30">
                <div className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[10px] mb-2 border-b pb-1.5 flex items-center justify-between">
                    <span>Chart Key</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Internal Matched Profile</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-slate-50 dark:ring-slate-800/20" />
                    <span className="font-medium text-slate-500">External / Unmatched Info</span>
                </div>
                <div className="pt-2 flex flex-col gap-1.5 border-t mt-1 opacity-70">
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

            {/* Tree Container */}
            <div ref={containerRef} className="w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]">
                <Tree
                    data={initialData}
                    translate={translate}
                    zoom={zoom}
                    renderCustomNodeElement={(rd3tProps) => <NodeCard {...rd3tProps} />}
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
