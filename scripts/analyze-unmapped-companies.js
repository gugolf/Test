const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function aggressiveNormalize(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
}

async function check() {
    console.log('--- Analyzing Unmapped Companies ---');
    let from = 0;
    const batchSize = 2000;
    let hasMore = true;
    const counts = {};

    while (hasMore) {
        const { data, error } = await supabase
            .from('candidate_experiences')
            .select('company')
            .is('company_id', null)
            .neq('company', '')
            .range(from, from + batchSize - 1);

        if (error) { console.error('Error:', error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(d => {
                if (d.company) counts[d.company] = (counts[d.company] || 0) + 1;
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }

    const uniqueNames = Object.keys(counts);
    console.log(`Total Unmapped Rows: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
    console.log(`Unique Unmapped Names: ${uniqueNames.length}`);

    // Grouping by Aggressive Normalization
    const groups = {};
    uniqueNames.forEach(name => {
        const key = aggressiveNormalize(name);
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ name, count: counts[name] });
    });

    console.log(`Unique Groups (Normalized): ${Object.keys(groups).length}`);

    // Show top 20 groups
    const sortedGroups = Object.entries(groups).map(([key, list]) => {
        const totalRows = list.reduce((sum, item) => sum + item.count, 0);
        const bestName = list.sort((a, b) => b.count - a.count || b.name.length - a.name.length)[0].name;
        return { key, bestName, totalRows, variations: list.map(l => l.name) };
    }).sort((a, b) => b.totalRows - a.totalRows);

    console.log('\nTop 20 Unmapped Groups:');
    sortedGroups.slice(0, 20).forEach(g => {
        console.log(`- ${g.bestName} (${g.totalRows} rows) [Variations: ${g.variations.join(', ')}]`);
    });
}

check();
