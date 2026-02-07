"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AgingStats {
    total: number;
    fresh: number; // < 1 month
    months1to3: number;
    months4to6: number;
    months6plus: number;
}

export async function getAgingStats(): Promise<AgingStats> {
    try {
        const now = new Date();
        const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
        const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
        const d180 = new Date(now); d180.setDate(d180.getDate() - 180);

        // Fetch Total Count
        // Standard count query
        const { count: total, error: errTotal } = await supabase
            .from('Candidate Profile')
            .select('*', { count: 'exact', head: true });

        if (errTotal) throw errTotal;

        // Parallel Count Queries using DB filtering (Now accurate due to ISO dates from migration)

        // 1. Fresh: modify_date > 30 days ago
        const pFresh = supabase.from('Candidate Profile')
            .select('*', { count: 'exact', head: true })
            .gt('modify_date', d30.toISOString());

        // 2. 1-3M: modify_date <= 30 ago AND > 90 ago
        const p1to3 = supabase.from('Candidate Profile')
            .select('*', { count: 'exact', head: true })
            .lte('modify_date', d30.toISOString())
            .gt('modify_date', d90.toISOString());

        // 3. 4-6M: modify_date <= 90 ago AND > 180 ago
        const p4to6 = supabase.from('Candidate Profile')
            .select('*', { count: 'exact', head: true })
            .lte('modify_date', d90.toISOString())
            .gt('modify_date', d180.toISOString());

        // 4. 6M+: modify_date <= 180 ago
        // Note: This also captures very old dates or newly migrated old dates correctly
        const p6plus = supabase.from('Candidate Profile')
            .select('*', { count: 'exact', head: true })
            .lte('modify_date', d180.toISOString());

        const [rFresh, r1to3, r4to6, r6plus] = await Promise.all([pFresh, p1to3, p4to6, p6plus]);

        return {
            total: total || 0,
            fresh: rFresh.count || 0,
            months1to3: r1to3.count || 0,
            months4to6: r4to6.count || 0,
            months6plus: r6plus.count || 0
        };

    } catch (error) {
        console.error("Error fetching aging stats:", error);
        return { total: 0, fresh: 0, months1to3: 0, months4to6: 0, months6plus: 0 };
    }
}

export async function deleteCandidates(candidateIds: string[]) {
    try {
        if (!candidateIds || candidateIds.length === 0) return { success: true };

        // 1. Resume Uploads 
        await supabase.from('resume_uploads').delete().in('candidate_id', candidateIds);

        // 2. CSV Logs
        await supabase.from('csv_upload_logs').delete().in('candidate_id', candidateIds);

        // 3. Child Tables
        await supabase.from('candidate_experiences').delete().in('candidate_id', candidateIds);
        await supabase.from('candidate_educations').delete().in('candidate_id', candidateIds);
        await supabase.from('candidate_profile_enhance').delete().in('candidate_id', candidateIds);

        // 4. JR Candidate
        await supabase.from('jr_candidates').delete().in('candidate_id', candidateIds);

        // 5. Main Profile
        const { error } = await supabase.from('Candidate Profile').delete().in('candidate_id', candidateIds);

        if (error) throw error;
        return { success: true };

    } catch (error: any) {
        console.error("Delete Candidates Error:", error);
        return { success: false, error: error.message };
    }
}

export async function refreshCandidate(candidateId: string, name: string, linkedin: string) {
    try {
        if (!candidateId || !linkedin) {
            return { success: false, error: "Missing ID or LinkedIn" };
        }

        const { error } = await supabase.from('csv_upload_logs').insert([
            {
                candidate_id: candidateId,
                name: name,
                linkedin: linkedin,
                status: 'PENDING_REFRESH',
                upload_id: `REFRESH_${Date.now()}_${candidateId}`
            }
        ]);

        if (error) throw error;
        return { success: true };

    } catch (error: any) {
        console.error("Refresh Candidate Error:", error);
        return { success: false, error: error.message };
    }
}

// Helper to fetch all used IDs
async function getAllUsedIds(): Promise<Set<string>> {
    let allIds: string[] = [];
    let page = 0;
    const size = 1000; // Supabase default max limit is often 1000. Do not exceed.

    while (true) {
        const { data, error } = await supabase
            .from('jr_candidates')
            .select('candidate_id')
            .range(page * size, (page + 1) * size - 1);

        if (error) {
            console.error("Error fetching used IDs:", error);
            break;
        }
        if (!data || data.length === 0) break;

        allIds = allIds.concat(data.map((r: any) => r.candidate_id));
        if (data.length < size) break;
        page++;
    }
    return new Set(allIds);
}

export async function getUnusedStats() {
    try {
        const usedIds = await getAllUsedIds();
        const usedCount = usedIds.size;

        const { count: total, error } = await supabase
            .from('Candidate Profile')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        const totalCount = total || 0;

        return {
            total: totalCount,
            used: usedCount,
            unused: Math.max(0, totalCount - usedCount)
        };
    } catch (error) {
        console.error("Error stats:", error);
        return { total: 0, used: 0, unused: 0 };
    }
}

export async function getUnusedCandidates(page = 1, pageSize = 20, search = "") {
    try {
        // 1. Get All Used IDs
        const usedIds = await getAllUsedIds();

        // 2. Fetch All Candidates (Lightweight)
        // We fetch all because 'NOT IN' with 6000+ IDs is risky for URL limits.
        let allCandidates: any[] = [];
        let p = 0;
        const s = 1000;

        while (true) {
            const { data, error } = await supabase
                .from('Candidate Profile')
                .select('candidate_id, candidate_name, candidate_email, candidate_current_company, candidate_image_url, modify_date, created_date, linkedin')
                .range(p * s, (p + 1) * s - 1)
                .order('modify_date', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) break;
            allCandidates = allCandidates.concat(data);
            if (data.length < s) break;
            p++;
        }

        // 3. Filter In-Memory
        let unused = allCandidates.filter(c => !usedIds.has(c.candidate_id));

        // 4. Search
        if (search) {
            const lowerSearch = search.toLowerCase();
            unused = unused.filter(c =>
                (c.candidate_name && c.candidate_name.toLowerCase().includes(lowerSearch)) ||
                (c.candidate_id && c.candidate_id.toLowerCase().includes(lowerSearch)) ||
                (c.candidate_current_company && c.candidate_current_company.toLowerCase().includes(lowerSearch))
            );
        }

        const total = unused.length;

        // 5. Paginate
        const start = (page - 1) * pageSize;
        const sliced = unused.slice(start, start + pageSize);

        return { data: sliced, total };

    } catch (error) {
        console.error("Error fetching unused list:", error);
        return { data: [], total: 0 };
    }
}
