const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Syncing HQ References ---');

    // 1. Fetch current references to avoid duplicates
    const { data: currentRefs, error: e1 } = await supabase
        .from('company_reference_location')
        .select('company, unique_location');

    if (e1) { console.error('Error fetching current refs:', e1.message); return; }

    const refMap = new Set(currentRefs.map(r => `${r.company.toLowerCase().trim()}|${r.unique_location.toLowerCase().trim()}`));
    console.log(`Loaded ${currentRefs.length} existing references.`);

    // 2. Fetch potential new references from candidate_experiences in batches
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    const candidates = [];

    console.log('\nScanning candidate_experiences for potential references...');
    while (hasMore) {
        console.log(`   Batch: ${from} to ${from + batchSize}...`);
        const { data, error } = await supabase
            .from('candidate_experiences')
            .select('company, country')
            .or('work_location.is.null,work_location.eq.""')
            .not('country', 'is', null)
            .neq('country', '')
            .not('company', 'is', null)
            .neq('company', '')
            .range(from, from + batchSize - 1);

        if (error) {
            console.error('Error fetching batch:', error.message);
            break;
        }

        if (data.length === 0) {
            hasMore = false;
        } else {
            candidates.push(...data);
            if (data.length < batchSize) {
                hasMore = false;
            } else {
                from += batchSize;
            }
        }
    }
    console.log(`Found ${candidates.length} potential reference rows.`);

    // 3. Aggregate unique mappings
    const newMappings = [];
    candidates.forEach(c => {
        const comp = c.company.trim();
        const coun = c.country.trim();
        const key = `${comp.toLowerCase()}|${coun.toLowerCase()}`;

        if (!refMap.has(key)) {
            newMappings.push({ company: comp, unique_location: coun });
            refMap.add(key); // Avoid duplicates within this run
        }
    });

    console.log(`Found ${newMappings.length} unique NEW mappings to insert.`);

    // 4. Batch insert
    if (newMappings.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < newMappings.length; i += batchSize) {
            const batch = newMappings.slice(i, i + batchSize);
            const { error: iErr } = await supabase
                .from('company_reference_location')
                .insert(batch);

            if (iErr) {
                console.error(`Error inserting batch ${i}:`, iErr.message);
            } else {
                console.log(`Successfully inserted batch starting at index ${i}.`);
            }
        }
    }

    console.log('\n✅ Step 1 Complete: HQ references synced.');
}

run();
