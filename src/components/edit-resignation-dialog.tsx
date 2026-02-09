"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateEmploymentRecord } from "@/app/actions/employment";
import { toast } from "sonner";
import { Save, Loader2, Calendar, FileText } from "lucide-react";

interface EditResignationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: any;
    onSuccess: () => void;
}

export function EditResignationDialog({
    open,
    onOpenChange,
    initialData,
    onSuccess
}: EditResignationDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        resign_date: "",
        resignation_reason: "", // Maps to resignation_reason_test in DB based on usage in markAsResigned
        resign_note: "",
        position: "",
        bu: ""
    });

    useEffect(() => {
        if (open && initialData) {
            setFormData({
                resign_date: initialData.resign_date || "",
                resignation_reason: initialData.resignation_reason_test || initialData.resignation_reason || "",
                resign_note: initialData.resign_note || "",
                position: initialData.position || "",
                bu: initialData.bu || ""
            });
        }
    }, [open, initialData]);

    const handleSubmit = async () => {
        setLoading(true);
        if (!initialData?.employment_record_id) {
            toast.error("Error: Missing Record ID");
            setLoading(false);
            return;
        }

        const res = await updateEmploymentRecord(initialData.employment_record_id, {
            resign_date: formData.resign_date || null,
            resignation_reason_test: formData.resignation_reason || null,
            resign_note: formData.resign_note || null,
            position: formData.position || null,
            bu: formData.bu || null
        });

        if (res.success) {
            toast.success("Resignation details updated successfully!");
            onSuccess();
            onOpenChange(false);
        } else {
            toast.error("Failed to update: " + res.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
                <div className="bg-red-50 p-6 text-red-900 text-center border-b border-red-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Save className="w-8 h-8 text-red-500" />
                    </div>
                    <DialogTitle className="text-2xl font-black mb-1">Edit Resignation</DialogTitle>
                    <DialogDescription className="text-red-700/80 font-medium">
                        Update resignation details for <b>{initialData?.candidate_name}</b>.
                    </DialogDescription>
                </div>

                <div className="p-6 grid gap-6">
                    {/* Basic Info Read-only/Edit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Position</Label>
                            <Input
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Business Unit</Label>
                            <Input
                                value={formData.bu}
                                onChange={(e) => setFormData({ ...formData, bu: e.target.value })}
                                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Resignation Date
                        </Label>
                        <Input
                            type="date"
                            value={formData.resign_date}
                            onChange={(e) => setFormData({ ...formData, resign_date: e.target.value })}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Reason
                        </Label>
                        <Input
                            placeholder="e.g. Career Growth"
                            value={formData.resignation_reason}
                            onChange={(e) => setFormData({ ...formData, resignation_reason: e.target.value })}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Note</Label>
                        <Textarea
                            placeholder="Additional details..."
                            value={formData.resign_note}
                            onChange={(e) => setFormData({ ...formData, resign_note: e.target.value })}
                            className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 rounded-xl font-bold uppercase text-xs tracking-widest h-12"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-[2] bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest h-12 shadow-lg shadow-red-500/20"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Update
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
