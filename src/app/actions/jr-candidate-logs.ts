"use server";

import { adminAuthClient } from "@/lib/supabase/admin";

export async function getJRCandidateDetails(jrCandidateId: string) {
    const supabase = adminAuthClient;

    // 1. Get JR Candidate Meta & Logs
    // 1. Get JR Candidate Meta
    const { data: jrCandidate, error: jrError } = await (supabase as any)
        .from('jr_candidates')
        .select('*')
        .eq('jr_candidate_id', jrCandidateId)
        .single();

    if (jrError || !jrCandidate) {
        console.error("Error fetching JR candidate:", jrError);
        return null;
    }

    // 2. Get Candidate Profile (Manual Join due to missing FK and Table Name space)
    const { data: candidateProfile, error: profileError } = await (supabase as any)
        .from('Candidate Profile')
        .select('name, photo')
        .eq('candidate_id', jrCandidate.candidate_id)
        .single();

    if (profileError) {
        console.error("Error fetching Candidate Profile:", profileError);
        // Continue without profile if error, or handle as needed. 
        // For now, attaching what we have.
    }

    const meta = {
        ...jrCandidate,
        candidate_profile: {
            name: candidateProfile?.name,
            photo_url: candidateProfile?.photo // 'photo' is the column name from list_tables, mapped to photo_url for frontend
        }
    };

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
