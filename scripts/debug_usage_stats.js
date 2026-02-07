const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsageStats() {
    try {
        console.log("1. Fetching Total Count from 'Candidate Profile'...");
        const { count: totalCount, error: totalError } = await supabase
            .from('Candidate Profile')
            .select('*', { count: 'exact', head: true });

        if (totalError) {
            console.error("Total Count Error:", totalError);
        } else {
            console.log("Total Candidates:", totalCount);
        }

        console.log("\n2. Fetching Used IDs from 'jr_candidates'...");
        // Check total count first
        const { count: jrCount, error: jrCountError } = await supabase
            .from('jr_candidates')
            .select('*', { count: 'exact', head: true });

        if (jrCountError) console.error("JR Count Error:", jrCountError);
        else console.log("Total Rows in jr_candidates:", jrCount);

        const { data: usedData, error: usedError } = await supabase
            .from('jr_candidates')
            .select('candidate_id');

        if (usedError) {
            console.error("Used IDs Error:", usedError);
        } else {
            console.log("Used Rows Found:", usedData.length);
            const usedIds = [...new Set(usedData.map(r => r.candidate_id))];
            console.log("Unique Used IDs:", usedIds.length);
            if (usedIds.length > 0) {
                console.log("Sample Used IDs:", usedIds.slice(0, 5));
            }

            console.log("\n3. Testing 'Not In' Query...");
            let query = supabase
                .from('Candidate Profile')
                .select('candidate_id', { count: 'exact', head: true });

            if (usedIds.length > 0) {
                // Correct syntax check
                // .not('candidate_id', 'in', `(${usedIds.join(',')})`) // This expects string formatted list? 
                // Or does Supabase JS client expect array for 'in' filter but string for 'not.in'?
                // Actually .not('col', 'in', '('+list+')') is for PostgREST syntax if raw.
                // JS Client: .not('candidate_id', 'in', usedIds) ? NO, .in() takes array. .not() takes operator.
                // .not('candidate_id', 'in', usedIds) <- This might be WRONG in JS Client.
                // JS Client: .filter('candidate_id', 'not.in', `(${usedIds.join(',')})`)

                // Let's test the syntax I used in the code:
                // query = query.not('candidate_id', 'in', `(${usedIds.join(',')})`);

                // If I pass array to second arg?
            }

            // Let's try to query a sample logic
            // In the actual code I used: query.not('candidate_id', 'in', `(${usedIds.join(',')})`);
            // Let's see if that throws.

            try {
                const { count: unusedCount, error: unusedError } = await query
                    .not('candidate_id', 'in', `(${usedIds.join(',')})`); // mimicking code

                if (unusedError) console.error("Unused Query Error (String format):", unusedError);
                else console.log("Unused Count (String format):", unusedCount);

            } catch (e) {
                console.error("Catch String format:", e);
            }
        }

    } catch (e) {
        console.error("Global Error:", e);
    }
}

testUsageStats();
