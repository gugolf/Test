const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking jr_candidates Structure ---');
    
    // 1. jr_candidates columns
    const { data: jrc, error: jrcErr } = await supabase.from('jr_candidates').select('*').limit(1);
    if (jrcErr) {
        console.error('Error fetching jr_candidates:', jrcErr);
    } else if (jrc && jrc.length > 0) {
        console.log('jr_candidates columns:', Object.keys(jrc[0]));
        console.log('Sample data:', jrc[0]);
    } else {
        console.log('jr_candidates is empty.');
    }

    // 2. Check unique values for List Type (Longlist / Top profile)
    // I'll guess the column name might be 'list_type', 'type', or something similar if it exists.
    // Let's just fetch a few more rows to see common values if the table is small.
    const { data: samples } = await supabase.from('jr_candidates').select('*').limit(20);
    if (samples) {
        console.log('Sample list types or statuses:');
        samples.forEach(s => {
            console.log(`Candidate ${s.candidate_id}: JR ${s.jr_id}, Mapping: ${JSON.stringify(s)}`);
        });
    }
}

check();
