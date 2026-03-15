const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking Candidate Profile Columns ---');

    // Fetch one row to see column names
    const { data, error } = await supabase
        .from('Candidate Profile')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error.message);
    } else if (data && data.length > 0) {
        console.log('First row columns:', Object.keys(data[0]));
        console.log('First row data:', data[0]);
    } else {
        console.log('No data found in "Candidate Profile"');
        // If no data, we still need columns. Let's try to get them via another way if possible.
    }

    // Also check the RPC definition if we can
    console.log('\n--- Checking reserve_candidate_ids RPC ---');
    const { data: idRange, error: rpcError } = await supabase.rpc('reserve_candidate_ids', { batch_size: 1 });
    if (rpcError) {
        console.error('RPC Error:', rpcError.message);
    } else {
        console.log('RPC result for batch_size 1:', idRange);
    }
}

check();
