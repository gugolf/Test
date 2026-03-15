const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Deep Investigation: Master vs Variation ---');

    const { count: masterCount } = await supabase.from('company_master').select('*', { count: 'exact', head: true });
    const { count: varCount } = await supabase.from('company_variation').select('*', { count: 'exact', head: true });

    console.log(`Master Count: ${masterCount}`);
    console.log(`Variation Count: ${varCount}`);

    // Find masters with no variations
    // Since we can't reliably use rpc execute_sql for joins if permissions are tight, 
    // we'll fetch master IDs and variation IDs and compare locally if feasible, 
    // or use a smart query.

    // Fetch all variation company_ids (might be many, but 4.5k is fine)
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    const variationMasterIds = new Set();

    while (hasMore) {
        const { data, error } = await supabase
            .from('company_variation')
            .select('company_id')
            .range(from, from + batchSize - 1);
        if (error) { console.error(error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(v => variationMasterIds.add(String(v.company_id)));
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Unique Masters with Variations: ${variationMasterIds.size}`);

    // Now check master records
    from = 0;
    hasMore = true;
    let mastersWithNoVariations = 0;
    const samples = [];

    while (hasMore) {
        const { data, error } = await supabase
            .from('company_master')
            .select('company_id, company_master')
            .range(from, from + batchSize - 1);
        if (error) { console.error(error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(m => {
                if (!variationMasterIds.has(String(m.company_id))) {
                    mastersWithNoVariations++;
                    if (samples.length < 10) samples.push(m);
                }
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }

    console.log(`\nMasters with NO variations: ${mastersWithNoVariations}`);
    console.log('Sample of "Orphaned" Masters:');
    samples.forEach(s => console.log(`- ID: ${s.company_id}, Name: ${s.company_master}`));

    console.log('\nConclusion:');
    if (mastersWithNoVariations > 0) {
        console.log(`Every master record SHOULD have at least its primary name as a variation.`);
        console.log(`The discrepancy is because ${mastersWithNoVariations} master records are missing their variation entries.`);
    }
}

check();
