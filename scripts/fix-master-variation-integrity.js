const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Fixing Master-Variation Integrity ---');

    // 1. Fetch current max variation_id
    const { data: vMax, error: vErr } = await supabase.from('company_variation').select('variation_id').order('variation_id', { ascending: false }).limit(1);
    if (vErr) { console.error('Error fetching max variation_id:', vErr.message); return; }
    let nextVariationId = (vMax[0]?.variation_id || 0) + 1;
    console.log(`Starting with variation_id: ${nextVariationId}`);

    // 2. Fetch all variation company_ids to identify orphans
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    const mastersWithVariations = new Set();
    while (hasMore) {
        const { data, error } = await supabase.from('company_variation').select('company_id').range(from, from + batchSize - 1);
        if (error) break;
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(v => mastersWithVariations.add(String(v.company_id)));
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Found ${mastersWithVariations.size} masters that already have variations.`);

    // 3. Fetch all master records and identify orphans
    from = 0;
    hasMore = true;
    let createdCount = 0;

    console.log('\nScanning for orphaned masters and creating variations...');
    while (hasMore) {
        const { data: masters, error: mErr } = await supabase.from('company_master').select('company_id, company_master').range(from, from + batchSize - 1);
        if (mErr) { console.error(mErr.message); break; }
        if (masters.length === 0) { hasMore = false; break; }

        for (const m of masters) {
            if (!mastersWithVariations.has(String(m.company_id))) {
                // Insert primary variation
                const { error: insErr } = await supabase
                    .from('company_variation')
                    .insert({
                        variation_id: nextVariationId++,
                        company_id: m.company_id,
                        variation_name: m.company_master,
                        company_master_name: m.company_master
                    });

                if (insErr) {
                    console.error(`   Failed for Master ID ${m.company_id}:`, insErr.message);
                    nextVariationId--;
                } else {
                    createdCount++;
                    if (createdCount % 500 === 0) console.log(`   Created ${createdCount} variations...`);
                }
            }
        }

        if (masters.length < batchSize) hasMore = false;
        else from += batchSize;
    }

    console.log(`\n✅ Finished: Created ${createdCount} missing primary variations.`);
}

run();
