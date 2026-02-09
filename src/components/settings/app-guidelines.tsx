"use client";

import React from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, UserPlus, FileText, Briefcase, RefreshCw, Upload, Users } from "lucide-react";

export function AppGuidelines() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-black text-slate-900">User Guidelines</h2>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">

                {/* Candidate Management */}
                <AccordionItem value="candidates" className="border border-slate-100 rounded-2xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-800">Candidate Management</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 space-y-4 pt-2 pb-4 px-2">
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">1</span>
                                Manual Input
                            </h4>
                            <p className="text-sm pl-8">
                                Go to <b>Candidates &gt; Add Candidate</b>. Fill in the required details manually. This is best for single entry additions.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">2</span>
                                CSV Upload (Bulk)
                            </h4>
                            <p className="text-sm pl-8">
                                Go to <b>Candidates &gt; Import</b>. Upload a CSV file matching the system template. This allows you to import hundreds of candidates at once along with their embedding data for AI Search.
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Resume Management */}
                <AccordionItem value="resumes" className="border border-slate-100 rounded-2xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-800">Resume Management</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 space-y-4 pt-2 pb-4 px-2">
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Upload className="w-4 h-4" /> Upload / Replace Resume
                            </h4>
                            <div className="text-sm pl-8">
                                Navigate to a <b>Candidate Detail Page</b>. On the right side &quot;Resume&quot; panel:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>If no resume exists, click <b>&quot;Upload Resume&quot;</b>.</li>
                                    <li>If a resume exists, click the <b>( ... )</b> menu next to the &quot;Resume&quot; button and select <b>&quot;Update / Replace&quot;</b>.</li>
                                </ul>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Job Requisitions */}
                <AccordionItem value="jrs" className="border border-slate-100 rounded-2xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-800">Job Requisitions (JRs)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 space-y-4 pt-2 pb-4 px-2">
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">Create New JR</h4>
                            <p className="text-sm">
                                Go to <b>Job Requisition Menu &gt; Add New</b>. Fill in Position, BU, Target Date, and other details.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">Add Candidate to JR</h4>
                            <p className="text-sm">
                                Open a <b>Candidate Detail Page</b>. Viewing the &quot;Active Pipelines&quot; or &quot;History&quot; section, click <b>&quot;Add to JR&quot;</b>. Select the target JR from the list.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">Move Pipeline Stage</h4>
                            <p className="text-sm">
                                In <b>Candidate Detail</b> or on the <b>Kanban Board</b>, you can change a candidate&apos;s status (e.g., from &quot;Screening&quot; to &quot;Interview&quot;). The system tracks all status changes.
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* User Settings */}
                <AccordionItem value="users" className="border border-slate-100 rounded-2xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-800">User Management</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 space-y-4 pt-2 pb-4 px-2">
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">Manage Users</h4>
                            <div className="text-sm">
                                Go to <b>Settings &gt; Users</b>. Here you can:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li><b>Add User</b>: Map a Google Email to a Real Name.</li>
                                    <li><b>Edit</b>: Change the Real Name displayed for an email.</li>
                                    <li><b>Delete</b>: Remove the mapping (reverts to showing email).</li>
                                </ul>
                                This Real Name is used in Reports and Tables to identify who performed actions.
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
    );
}
