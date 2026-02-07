
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = fs.readFileSync(envPath, { encoding: 'utf8' });
    envConfig.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
} catch (e) {
    console.error("Error loading .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDates() {
    console.log("Starting Date Normalization (Round 2 - Force Update)...");

    let page = 0;
    const pageSize = 1000;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${page}...`);
        const { data, error } = await supabase
            .from('Candidate Profile')
            .select('candidate_id, modify_date, created_date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Error fetching data:", error);
            break;
        }

        if (data.length === 0) {
            hasMore = false;
            break;
        }

        const updates = [];

        for (const row of data) {
            let original = row.modify_date;

            // If already ISO (e.g., '2026-01-11T...'), skip unless we want to standardize everything?
            // Simple check: does it look like ISO? YYYY-MM-DD
            if (original && original.match(/^\d{4}-\d{2}-\d{2}/)) {
                continue;
            }

            if (!original) original = row.created_date;
            if (!original) continue;

            let d = null;

            // Handle Slash formats (DD/MM/YYYY or MM/DD/YYYY)
            if (original.includes('/')) {
                const parts = original.split('/');
                if (parts.length === 3) {
                    const p0 = parseInt(parts[0], 10);
                    const p1 = parseInt(parts[1], 10);
                    const p2 = parseInt(parts[2], 10);

                    // Guessing logic
                    if (p0 > 12) {
                        // Definitely DD/MM/YYYY
                        d = new Date(p2, p1 - 1, p0, 12, 0, 0);
                    } else if (p1 > 12) {
                        // Definitely MM/DD/YYYY (e.g. 11/13/2025)
                        d = new Date(p2, p0 - 1, p1, 12, 0, 0);
                    } else {
                        // Ambiguous (e.g. 9/9/2025 or 01/02/2026)
                        // Default to DD/MM/YYYY (Thai/GB standard)
                        d = new Date(p2, p1 - 1, p0, 12, 0, 0);
                    }
                }
            } else if (original.match(/^\d{4}-\d{2}-\d{2}/)) {
                d = new Date(original);
            }

            if (d && !isNaN(d.getTime())) {
                const iso = d.toISOString();
                // Only update if different
                if (iso !== row.modify_date) {
                    updates.push({
                        candidate_id: row.candidate_id,
                        modify_date: iso
                    });
                }
            }
        }

        if (updates.length > 0) {
            console.log(`Updating ${updates.length} rows in this batch...`);
            const chunkSize = 50;
            for (let i = 0; i < updates.length; i += chunkSize) {
                const chunk = updates.slice(i, i + chunkSize);
                await Promise.all(chunk.map(u =>
                    supabase.from('Candidate Profile')
                        .update({ modify_date: u.modify_date })
                        .eq('candidate_id', u.candidate_id)
                ));
            }
            totalUpdated += updates.length;
        }

        page++;
        // Remove strict limit, but keep safeguard
        if (page > 200) break; // 200k rows max
    }

    console.log(`\nFinished! Total rows updated: ${totalUpdated}`);
}

fixDates();
