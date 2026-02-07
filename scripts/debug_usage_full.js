const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFullStats() {
    try {
        console.log("--- Debugging Full Stats ---");

        // 1. Check Total Rows in jr_candidates
        const { count: totalRows, error: countError } = await supabase
            .from('jr_candidates')
            .select('*', { count: 'exact', head: true });

        console.log(`Total Rows in jr_candidates: ${totalRows} (Error: ${countError?.message || 'None'})`);

        // 2. Fetch with Default Limit (1000)
        const { data: defaultData } = await supabase
            .from('jr_candidates')
            .select('candidate_id');

        const defaultUnique = new Set(defaultData?.map(r => r.candidate_id)).size;
        console.log(`Default Limit (1000) -> Fetched: ${defaultData?.length}, Unique IDs: ${defaultUnique}`);

        // 3. Loop Fetch
        console.log("Starting Loop Fetch...");
        let allUsedIds = [];
        let page = 0;
        const size = 1000;

        while (true) {
            const { data, error } = await supabase
                .from('jr_candidates')
                .select('candidate_id')
                .range(page * size, (page + 1) * size - 1);

            if (error) {
                console.error("Loop Error:", error);
                break;
            }

            if (!data || data.length === 0) break;

            allUsedIds = allUsedIds.concat(data.map(r => r.candidate_id));
            if (data.length < size) break;
            page++;
        }

        const rangeUnique = new Set(allUsedIds).size;
        console.log(`Loop Fetch Total -> Fetched: ${allUsedIds.length}, Unique IDs: ${rangeUnique}`);

        // 4. Simulate In-Memory Filtering
        console.log("\n--- In-Memory Simulation ---");

        // Fetch All Candidates
        let allCands = [];
        page = 0;

        while (true) {
            const { data, error } = await supabase
                .from('Candidate Profile')
                .select('candidate_id')
                .range(page * size, (page + 1) * size - 1);

            if (!data || data.length === 0) break;
            allCands = allCands.concat(data);
            if (data.length < size) break;
            page++;
        }
        console.log(`Expected Total Candidates: ${allCands.length}`);

        const usedSet = new Set(allUsedIds);
        const unused = allCands.filter(c => !usedSet.has(c.candidate_id));

        console.log(`In-Memory Calc -> Used: ${usedSet.size}, Unused: ${unused.length}`);
        console.log(`Sample Unused:`, unused.slice(0, 3));

    } catch (e) {
        console.error("Script Error:", e);
    }
}

debugFullStats();
