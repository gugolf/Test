"use server";

import { adminAuthClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type FeedbackData = {
    jr_candidate_id: string;
    interview_type: string;
    interviewer_name: string;
    interview_date: string;
    rating: number;
    recommendation: string;
    feedback_text: string;
    feedback_file_url?: string;
    feedback_id?: number;
};

export async function submitInterviewFeedback(data: FeedbackData) {
    const supabase = adminAuthClient as any;

    try {
        // 1. Prepare Payload
        const payload: any = {
            jr_candidate_id: data.jr_candidate_id,
            Interviewer_type: data.interview_type,
            Interviewer_name: data.interviewer_name,
            interview_date: data.interview_date,
            rating_score: data.rating,
            overall_recommendation: data.recommendation,
            feedback_text: data.feedback_text,
            feedback_file: data.feedback_file_url || null,
        };

        // Handle ID for Upsert
        if (data.feedback_id) {
            payload.feedback_id = data.feedback_id;
        } else {
            payload.feedback_id = Date.now();
        }

        // 2. Perform Upsert
        const { data: result, error } = await supabase
            .from('interview_feedback')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error("Submit Feedback Error:", error);
            return { success: false, error: error.message };
        }

        // 3. Trigger n8n Webhook (only if file is attached)
        if (data.feedback_file_url) {
            // Fetch dynamic URL from config
            const { data: config } = await supabase
                .from('n8n_configs')
                .select('url')
                .eq('name', 'interview_feedback_webhook')
                .single();

            if (config?.url) {
                // Fire webhook
                fetch(config.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        feedback_id: result.feedback_id,
                        candidate_id: data.jr_candidate_id,
                        feedback_text: data.feedback_text,
                        rating: data.rating,
                        recommendation: data.recommendation,
                        file_url: data.feedback_file_url,
                        interviewer: data.interviewer_name,
                        type: data.interview_type,
                        timestamp: new Date().toISOString()
                    })
                }).catch((err: any) => console.error("Failed to trigger n8n:", err));
            } else {
                console.warn("n8n config 'interview_feedback_webhook' not found.");
            }
        }

        revalidatePath(`/requisitions/manage/candidate/${data.jr_candidate_id}`);
        return { success: true };
    } catch (error: any) {
        console.error("Submit Feedback Exception:", error);
        return { success: false, error: error.message };
    }
}
