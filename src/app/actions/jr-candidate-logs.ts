"use server";

import { adminAuthClient } from "@/lib/supabase/admin";

export async function getJRCandidateDetails(jrCandidateId: string) {
    const supabase = adminAuthClient;

    // 1. Get JR Candidate Meta & Logs
    const { data: meta, error: metaError } = await (supabase as any)
        .from('jr_candidates')
        .select(`
            *,
            candidates:candidate_id (
                candidate_name,
                candidate_image_url
            )
        `)
        .eq('jr_candidate_id', jrCandidateId)
        .single();

    if (metaError || !meta) {
        console.error("Error fetching JR candidate meta:", metaError);
        return null;
    }

    // 2. Get Logs
    const { data: logs, error: logsError } = await (supabase as any)
        .from('status_log')
        .select('*')
        .eq('jr_candidate_id', jrCandidateId)
        .order('log_id', { ascending: false });

    // 3. Get Interview Feedback
    const { data: feedback, error: feedbackError } = await (supabase as any)
        .from('interview_feedback')
        .select('*')
        .eq('jr_candidate_id', jrCandidateId)
        .order('interview_date', { ascending: false });

    return {
        meta,
        logs: logs || [],
        feedback: feedback || []
    };
}
