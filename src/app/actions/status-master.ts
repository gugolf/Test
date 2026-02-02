"use server";

import { adminAuthClient } from "@/lib/supabase/admin";

export async function getStatusMaster() {
    const { data, error } = await adminAuthClient
        .from('status_master')
        .select('*')
        .order('stage_order', { ascending: true });

    if (error) {
        console.error("Error fetching status master:", error);
        return [];
    }
    return data || [];
}
