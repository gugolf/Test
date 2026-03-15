const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Backfilling Missing Variations ---');

    // 1. Fetch current max variation_id
    const { data: vMax, error: vErr } = await supabase.from('company_variation').select('variation_id').order('variation_id', { ascending: false }).limit(1);
    if (vErr) { console.error('Error fetching max variation_id:', vErr.message); return; }
    let nextVariationId = (vMax[0]?.variation_id || 0) + 1;
    console.log(`Starting with variation_id: ${nextVariationId}`);

    // 2. Fetch all unique {company, company_id} from experiences where company_id >= 4338
    console.log('Fetching unique name-id pairs from candidate_experiences...');
    let from = 0;
    const batchSize = 2000;
    let hasMore = true;
    const pairs = {}; // "name|id" -> {name, id}

    while (hasMore) {
        const { data, error } = await supabase
            .from('candidate_experiences')
            .select('company, company_id')
            .gte('company_id', 4338)
            .range(from, from + batchSize - 1);

        if (error) { console.error('Error fetching experiences:', error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(d => {
                if (d.company && d.company_id) {
                    const key = `${d.company}|${d.company_id}`;
                    pairs[key] = { name: d.company, id: d.company_id };
                }
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }

    const uniquePairs = Object.values(pairs);
    console.log(`Identified ${uniquePairs.length} unique name-id mappings to verify.`);

    // 3. Load existing variations to avoid duplicates
    const existingVariations = new Set();
    from = 0;
    hasMore = true;
    while (hasMore) {
        const { data, error } = await supabase
            .from('company_variation')
            .select('variation_name, company_id')
            .range(from, from + batchSize - 1);
        if (error) break;
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(v => existingVariations.add(`${v.variation_name}|${v.company_id}`));
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Loaded ${existingVariations.size} existing variations.`);

    // 4. Backfill
    let createdCount = 0;
    // We need master names for company_master_name column
    const masterNames = {};
    const { data: masters } = await supabase.from('company_master').select('company_id, company_master').gte('company_id', 4338);
    masters.forEach(m => masterNames[m.company_id] = m.company_master);

    console.log('\nCreating missing variation records...');
    for (const pair of uniquePairs) {
        if (existingVariations.has(`${pair.name}|${pair.id}`)) continue;

        const { error: insErr } = await supabase
            .from('company_variation')
            .insert({
                variation_id: nextVariationId++,
                company_id: pair.id,
                variation_name: pair.name,
                company_master_name: masterNames[pair.id] || pair.name // Fallback to name if master not found
            });

        if (insErr) {
            console.error(`   Failed for "${pair.name}":`, insErr.message);
            nextVariationId--;
        } else {
            createdCount++;
        }

        if (createdCount % 100 === 0) console.log(`   Created ${createdCount} variations...`);
    }

    console.log(`\n✅ Finished: Created ${createdCount} missing variation records.`);
}

run();
