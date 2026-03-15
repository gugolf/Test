const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Testing reserve_candidate_ids RPC and capturing error ---');

    try {
        const { data, error } = await supabase.rpc('reserve_candidate_ids', { batch_size: 1 });

        if (error) {
            console.error('❌ RPC Error Detail:');
            console.error('Message:', error.message);
            console.error('Details:', error.details);
            console.error('Hint:', error.hint);
            console.error('Code:', error.code);
        } else {
            console.log('✅ RPC Success:', data);
        }
    } catch (e) {
        console.error('❌ Exception during RPC call:', e);
    }
}

check();
