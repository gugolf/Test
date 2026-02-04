"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, Mail, Phone, Globe, Calendar, GraduationCap, Briefcase, FileText, Languages, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Separator } from "@/components/ui/separator";

export default function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [formData, setFormData] = useState({
        // Core (Candidate Profile)
        name: "",
        email: "",
        mobile_phone: "",
        linkedin: "",
        nationality: "",
        gender: "",
        date_of_birth: "",
        year_of_bachelor_education: "",
        age: "",
        photo: "",

        // Enhanced (candidate_profile_enhance)
        skills: "",
        education: "",
        languages: "",
        about: ""
    });

    useEffect(() => {
        const fetchCandidate = async () => {
            try {
                // Fetch Core
                const { data: core, error: coreError } = await supabase
                    .from('Candidate Profile')
                    .select('*')
                    .eq('candidate_id', id)
                    .single();

                if (coreError) throw coreError;

                // Fetch Enhance
                const { data: enhance, error: enhanceError } = await supabase
                    .from('candidate_profile_enhance')
                    .select('*')
                    .eq('candidate_id', id)
                    .single(); // Might be null if no enhancement data

                setFormData({
                    name: core.name || "",
                    email: core.email || "",
                    mobile_phone: core.mobile_phone || "",
                    linkedin: core.linkedin || "",
                    nationality: core.nationality || "",
                    gender: core.gender || "",
                    date_of_birth: core.date_of_birth || "",
                    year_of_bachelor_education: core.year_of_bachelor_education ? String(core.year_of_bachelor_education) : "",
                    age: core.age ? String(core.age) : "",
                    photo: core.photo || "",

                    skills: enhance?.skills_list ? (Array.isArray(enhance.skills_list) ? enhance.skills_list.join(", ") : enhance.skills_list) : "",
                    education: enhance?.education_summary || "",
                    languages: enhance?.languages || "",
                    about: enhance?.about_summary || ""
                });

            } catch (error: any) {
                toast.error("Failed to load candidate: " + error.message);
                router.push(`/candidates/${id}`);
            } finally {
                setLoading(false);
            }
        };
        fetchCandidate();
    }, [id, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploadingPhoto(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update State
            setFormData(prev => ({ ...prev, photo: publicUrl }));

            toast.success("Photo uploaded! Remember to save changes.");

        } catch (error: any) {
            toast.error("Error uploading photo: " + error.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Update Core
            const { error: coreError } = await supabase
                .from('Candidate Profile')
                .update({
                    name: formData.name,
                    email: formData.email,
                    mobile_phone: formData.mobile_phone,
                    linkedin: formData.linkedin,
                    nationality: formData.nationality,
                    gender: formData.gender,
                    date_of_birth: formData.date_of_birth || null,
                    year_of_bachelor_education: formData.year_of_bachelor_education ? parseInt(formData.year_of_bachelor_education) : null,
                    age: formData.age ? parseInt(formData.age) : null,
                    photo: formData.photo, // Save photo URL
                    modify_date: new Date().toISOString()
                })
                .eq('candidate_id', id);

            if (coreError) throw new Error("Core update failed: " + coreError.message);

            // Update Enhance (Upsert)
            const { error: enhanceError } = await supabase
                .from('candidate_profile_enhance')
                .upsert({
                    candidate_id: id,
                    name: formData.name,
                    linkedin_url: formData.linkedin,
                    skills_list: formData.skills,
                    education_summary: formData.education,
                    languages: formData.languages,
                    about_summary: formData.about
                }, { onConflict: 'candidate_id' });

            if (enhanceError) throw new Error("Enhance update failed: " + enhanceError.message);

            toast.success("Candidate updated successfully!");
            router.push(`/candidates/${id}`);
            router.refresh();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="container max-w-4xl py-10">
            <Button variant="ghost" className="gap-2 mb-6" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" /> Back to Profile
            </Button>

            <form onSubmit={handleSave}>
                <Card className="border-t-4 border-t-primary shadow-lg">
                    <CardHeader className="bg-secondary/5 border-b">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <User className="h-6 w-6 text-primary" /> Edit Profile
                        </CardTitle>
                        <CardDescription>Update candidate information across core and enhanced profiles</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-8 pt-8">

                        {/* Avatar & Basic Info */}
                        <div className="flex flex-col md:flex-row gap-8">

                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-border/50">
                                        <AvatarImage src={formData.photo} className="object-cover" />
                                        <AvatarFallback className="text-4xl font-bold bg-secondary text-primary">
                                            {formData.name?.substring(0, 2)?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                                        {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                        <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                    </Label>
                                </div>
                                {uploadingPhoto && <span className="text-xs text-muted-foreground animate-pulse">Uploading...</span>}
                            </div>

                            {/* Basic Info Fields */}
                            <div className="flex-1 space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <span className="w-1 h-4 bg-primary rounded-full" /> Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" value={formData.name} onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nationality">Nationality</Label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input id="nationality" className="pl-9" value={formData.nationality} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <select id="gender" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.gender} onChange={handleChange}>
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input id="date_of_birth" type="date" className="pl-9" value={formData.date_of_birth} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Age</Label>
                                        <Input id="age" type="number" value={formData.age} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="year_of_bachelor_education">Bachelor Year</Label>
                                        <Input id="year_of_bachelor_education" type="number" value={formData.year_of_bachelor_education} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Contact Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-4 bg-blue-500 rounded-full" /> Contact
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="email" className="pl-9" value={formData.email} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile_phone">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="mobile_phone" className="pl-9" value={formData.mobile_phone} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                                    <Input id="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/..." />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Enhanced Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-4 bg-purple-500 rounded-full" /> Enhanced Details
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="about" className="flex items-center gap-2"><FileText className="h-4 w-4" /> About Summary</Label>
                                <Textarea id="about" className="min-h-[100px]" value={formData.about} onChange={handleChange} placeholder="Professional summary..." />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="skills" className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Skills (Comma separated)</Label>
                                <Textarea id="skills" value={formData.skills} onChange={handleChange} placeholder="Java, React, SQL..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="education" className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Education Summary</Label>
                                    <Textarea id="education" className="min-h-[100px]" value={formData.education} onChange={handleChange} placeholder="B.Sc Computer Science..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="languages" className="flex items-center gap-2"><Languages className="h-4 w-4" /> Languages</Label>
                                    <Textarea id="languages" className="min-h-[100px]" value={formData.languages} onChange={handleChange} placeholder="English (Fluent), Thai (Native)..." />
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 bg-secondary/5 py-4 border-t">
                        <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={saving || uploadingPhoto}>
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
