const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking Candidate Profile Table and Sequence ---');

    // 1. Get max ID from "Candidate Profile"
    const { data: maxIdData, error: maxIdError } = await supabase
        .from('Candidate Profile')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    if (maxIdError) {
        console.error('Error fetching max ID:', maxIdError.message);
    } else {
        const maxId = maxIdData[0]?.id || 0;
        console.log('Current Max ID in "Candidate Profile":', maxId);
    }

    // 2. Check the sequence status
    // Since we cannot run raw SQL easily via rpc if forbidden, we might try to find the sequence name.
    // Usually it is "Candidate Profile_id_seq" or similar.
    // We can try to get the next value by doing a dry-run insert or just checking metadata if possible.
    // But since we are on Supabase, we can check the table definition.

    // Let's try to get more table info via a RPC if it exists, or just try to insert a test record with ID 0 and see what happens (not great).
    // Actually, let's try to run a raw SQL via the `rpc` called `execute_sql` if it exists.
    // I see in previous steps I used node scripts to run supabase.from().select()...

    // If I can't run raw SQL, I'll rely on the Max ID and then check the code.
}

check();
