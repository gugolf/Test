const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Listing All Tables via RPC/Query ---');

    // We can try to query information_schema.tables directly if we have permission
    // Or just try to guess some common names.
    // However, I'll try to use the `execute_sql` RPC if the user has provided one in the past.
    // Wait, I saw "check-db.js" in the scripts folder. Let's see what it does.

    const { data, error } = await supabase.from('Candidate Profile').select('*').limit(1);
    if (error) console.log('Error access:', error.message);
    else console.log('Successfully accessed "Candidate Profile"');
}

check();
