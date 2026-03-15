const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
    console.log('--- Analyzing Company Master & Variations ---');

    // 1. Fetch Company Master Duplicates
    const { data: masters, error: e1 } = await supabase
        .from('company_master')
        .select('company_id, company_master, industry, group');

    if (e1) { console.error('Error masters:', e1.message); return; }

    const nameToIds = {};
    masters.forEach(m => {
        const name = (m.company_master || '').toLowerCase().trim();
        if (!nameToIds[name]) nameToIds[name] = [];
        nameToIds[name].push(m);
    });

    const duplicates = Object.entries(nameToIds).filter(([name, list]) => list.length > 1);
    console.log(`Total Master Records: ${masters.length}`);
    console.log(`Unique Names: ${Object.keys(nameToIds).length}`);
    console.log(`Duplicate Names found: ${duplicates.length}`);

    if (duplicates.length > 0) {
        console.log('\nSample Duplicates:');
        duplicates.slice(0, 5).forEach(([name, list]) => {
            console.log(`- "${name}":`);
            list.forEach(item => {
                console.log(`  ID: ${item.company_id}, Industry: ${item.industry}, Group: ${item.group}`);
            });
        });
    }

    // 2. Analyze Variations
    const { data: variations, error: e2 } = await supabase
        .from('company_variation')
        .select('*');

    if (e2) { console.error('Error variations:', e2.message); return; }

    console.log(`\nTotal Variation Records: ${variations.length}`);
    const unlinkedVariations = variations.filter(v => !v.company_id);
    console.log(`Variations missing company_id: ${unlinkedVariations.length}`);

    if (variations.length > 0) {
        console.log('\nSample Variations:');
        variations.slice(0, 5).forEach(v => {
            console.log(`- "${v.variation_name}" -> Master ID: ${v.company_id}`);
        });
    }
}

analyze();
