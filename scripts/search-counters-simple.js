const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking for ID Tracking Tables ---');

    // List tables that might be related to sequences or IDs
    const { data, error } = await supabase
        .from('Candidate Profile')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error access:', error.message);
    } else {
        console.log('Successfully accessed Candidate Profile');
    }

    // Try to find ANY table that might be a counter
    const potential = ['id_sequence', 'id_reservation', 'candidate_id_sequence', 'app_settings'];
    for (const p of potential) {
        const { data: d, error: e } = await supabase.from(p).select('*').limit(1);
        if (!e) console.log(`Table ${p} found:`, d);
    }
}

check();
