"use client";

import React, { useEffect, useState } from "react";
import { getN8nConfigs, updateN8nConfig, N8nConfig } from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Undo, ArrowLeft, Webhook } from "lucide-react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function N8nAdminPage() {
    const router = useRouter();
    const [configs, setConfigs] = useState<N8nConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ url: string, method: 'GET' | 'POST' }>({ url: '', method: 'POST' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        setLoading(true);
        const data = await getN8nConfigs();
        setConfigs(data);
        setLoading(false);
    };

    const startEdit = (config: N8nConfig) => {
        setEditingId(config.id);
        setEditForm({ url: config.url, method: config.method });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ url: '', method: 'POST' });
    };

    const handleSave = async (id: number) => {
        setSaving(true);
        const res = await updateN8nConfig(id, editForm.url, editForm.method);
        if (res.success) {
            toast.success("Configuration updated successfully");
            setEditingId(null);
            loadConfigs();
        } else {
            toast.error("Failed to update: " + res.error);
        }
        setSaving(false);
    };

    return (
        <div className="container mx-auto p-8 max-w-5xl space-y-8">
            <Button
                variant="ghost"
                className="w-fit p-0 h-auto text-slate-500 hover:text-slate-900"
                onClick={() => router.push('/')} // Or router.back()
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>

            <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 rounded-xl">
                    <Webhook className="w-8 h-8 text-pink-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">n8n Integration Hub</h1>
                    <p className="text-muted-foreground">Manage your automation webhooks and triggering methods.</p>
                </div>
            </div>

            <Card className="shadow-lg border-none bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Webhook Configurations</CardTitle>
                    <CardDescription>Current active endpoints for system automations.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Service Name</TableHead>
                                    <TableHead className="w-[100px]">Method</TableHead>
                                    <TableHead>Webhook URL</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {configs.map((config) => (
                                    <TableRow key={config.id}>
                                        <TableCell>
                                            <div className="font-semibold text-slate-700">{config.name}</div>
                                            <div className="text-xs text-slate-500">{config.description}</div>
                                        </TableCell>
                                        <TableCell>
                                            {editingId === config.id ? (
                                                <Select
                                                    value={editForm.method}
                                                    onValueChange={(val: 'GET' | 'POST') => setEditForm({ ...editForm, method: val })}
                                                >
                                                    <SelectTrigger className="w-[90px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="GET">GET</SelectItem>
                                                        <SelectItem value="POST">POST</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant={config.method === 'POST' ? 'default' : 'secondary'} className="font-mono">
                                                    {config.method}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === config.id ? (
                                                <Input
                                                    value={editForm.url}
                                                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                                    className="font-mono text-xs"
                                                />
                                            ) : (
                                                <div className="font-mono text-xs text-slate-600 truncate max-w-[400px]" title={config.url}>
                                                    {config.url}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingId === config.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                                        <Undo className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                    <Button size="icon" onClick={() => handleSave(config.id)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={() => startEdit(config)}>
                                                    Edit
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
