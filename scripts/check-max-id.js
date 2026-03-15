const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking Max Candidate ID ---');

    // Fetch the 10 highest IDs to see the pattern and max
    const { data, error } = await supabase
        .from('Candidate Profile')
        .select('candidate_id')
        .order('candidate_id', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Top 10 Candidate IDs:', data.map(d => d.candidate_id));
    }
}

check();
