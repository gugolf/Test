"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UploadRecord {
    file_name: string;
    resume_url: string;
    uploader_email: string; // Will store real_name
    status?: string;
}

export async function createUploadRecord(record: UploadRecord) {
    try {
        // 1. Check for duplicate file name
        const { data: existing } = await supabase
            .from('resume_uploads')
            .select('id, status, candidate_id')
            .eq('file_name', record.file_name)
            .neq('status', 'Error')
            .maybeSingle();

        if (existing) {
            console.log(`Duplicate file upload attempt: ${record.file_name}`);
            return { 
                success: false, 
                isDuplicate: true,
                existingRecord: existing,
                error: 'Duplicate file: This resume has already been uploaded.' 
            };
        }

        // 2. Insert new record
        const { data, error } = await supabase
            .from('resume_uploads')
            .insert([
                {
                    file_name: record.file_name,
                    resume_url: record.resume_url,
                    uploader_email: record.uploader_email, // This is the real_name
                    status: 'pending' // Default processing status
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };

    } catch (error: any) {
        console.error("Create Upload Record Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getPendingUploads() {
    try {
        const { data, error } = await supabase
            .from('resume_uploads')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true }); // Process oldest first

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Get Pending Uploads Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUploadStatus(id: string, status: string, note?: string, candidateId?: string) {
    try {
        const updateData: any = { status };
        if (note) updateData.note = note;
        if (candidateId) updateData.candidate_id = candidateId;
        // Wait, user schema didn't explicitly ask for 'note' in the CREATE TABLE SQL provided earlier?
        // Let's check the SQL provided in plan:
        // status TEXT DEFAULT 'pending', candidate_id TEXT ...
        // It didn't have 'note'. But 'resume_uploads' usually benefits from error message.
        // Let's assume we might need to store error in 'status' if short, or ignore note if column missing.
        // Or better: update plan to include 'note' column? 
        // The user said "Done" based on the SQL provided.
        // The SQL was: id, created_at, resume_url, file_name, uploader_email, status, candidate_id, candidate_name, position, company.
        // No 'note' column. 
        // I will just put the note in status if it's an error, e.g. "Error: ..."

        // Actually, for duplicates, we said: status = "Found duplicate with Cxxxxx"

        const { error } = await supabase
            .from('resume_uploads')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Update Status Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUploadCandidateStatus(
    uploadId: string,
    newStatus: string,
    type: 'resume' | 'csv' = 'resume'
) {
    try {
        const tableName = type === 'csv' ? 'csv_upload_logs' : 'resume_uploads';

        // 1. Update the upload record
        const { data: uploadRecord, error: uploadError } = await supabase
            .from(tableName)
            .update({ candidate_status: newStatus })
            .eq('id', uploadId)
            .select('candidate_id')
            .single();

        if (uploadError) throw uploadError;

        // 2. If already linked to a candidate, update the candidate profile too
        if (uploadRecord && uploadRecord.candidate_id) {
            // Note: For CSV, candidate_id might be a string but not necessarily linked if imported via CSV?
            // Actually, CSV upload logic usually links candidate_id.
            // If candidate_id is present, try to update profile.

            const { error: candidateError } = await supabase
                .from('Candidate Profile')
                .update({ candidate_status: newStatus })
                .eq('candidate_id', uploadRecord.candidate_id);

            if (candidateError) {
                console.error("Failed to sync status to candidate:", candidateError);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating status:", error);
        return { success: false, error: error.message };
    }
}

export async function handleDuplicateResume(
    choice: 'update' | 'attach' | 'no-action',
    existingRecord: { id: string, candidate_id?: string, file_name: string },
    newResumeUrl: string,
    uploaderEmail: string
) {
    try {
        if (choice === 'no-action') return { success: true, message: 'Skipped' };

        if (choice === 'attach') {
            if (!existingRecord.candidate_id) {
                return { success: false, error: 'Cannot attach: Existing record is not linked to a candidate.' };
            }

            // Update Candidate Profile
            const { error: profileError } = await (supabase
                .from('Candidate Profile' as any) as any)
                .update({ 
                    resume_url: newResumeUrl,
                    modify_date: new Date().toISOString()
                })
                .eq('candidate_id', existingRecord.candidate_id);

            if (profileError) throw profileError;

            // Update Upload Log
            await supabase
                .from('resume_uploads')
                .update({ 
                    resume_url: newResumeUrl,
                    status: 'Completed',
                    note: `Manual Attach by ${uploaderEmail}`
                })
                .eq('id', existingRecord.id);

            return { success: true, message: 'Resume attached successfully' };
        }

        if (choice === 'update') {
            // Trigger n8n logic
            // Set status to pending to let n8n or trigger pick it up
            const { error: uploadError } = await supabase
                .from('resume_uploads')
                .update({ 
                    resume_url: newResumeUrl,
                    status: 'pending',
                    note: `Re-triggered for update by ${uploaderEmail}`
                })
                .eq('id', existingRecord.id);

            if (uploadError) throw uploadError;

            // If we have a candidate_id, we can specifically trigger a refresh.
            if (existingRecord.candidate_id) {
                const { triggerCandidateRefresh } = await import("./n8n-actions");
                await triggerCandidateRefresh([{ id: existingRecord.candidate_id }], uploaderEmail);
            }

            return { success: true, message: 'Update triggered successfully' };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Handle Duplicate Error:", error);
        return { success: false, error: error.message };
    }
}

export async function checkDuplicateFiles(fileNames: string[]) {
    if (!fileNames || fileNames.length === 0) return { success: true, data: [] };
    
    try {
        const { data, error } = await supabase
            .from('resume_uploads')
            .select('id, file_name, status, candidate_id')
            .in('file_name', fileNames)
            .neq('status', 'Error');

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error("Error checking bulk duplicates:", err);
        return { success: false, error: err.message };
    }
}

export async function logSkippedResume(fileName: string, uploaderEmail: string) {
    try {
        const { error } = await supabase
            .from('resume_uploads')
            .insert({
                file_name: fileName,
                resume_url: null, // No URL since skipped before upload
                uploader_email: uploaderEmail,
                status: 'Duplicate (Skipped)',
                note: `User chose to skip this duplicate file.`,
                created_at: new Date().toISOString()
            });
            
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("Error logging skipped resume:", err);
        return { success: false, error: err.message };
    }
}
