const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
    console.log('--- Supabase Storage Buckets ---');
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Buckets:', data.map(b => b.name));
    }
}

checkBuckets();
