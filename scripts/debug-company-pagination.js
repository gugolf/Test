
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testPagination() {
    console.log('Testing Range Fetch...');

    // Try fetching 0-999
    const { data: page1 } = await supabase
        .from('company_master')
        .select('company_master')
        .range(0, 999);

    console.log(`Page 1 (0-999): ${page1?.length}`);

    // Try fetching 1000-1999
    const { data: page2 } = await supabase
        .from('company_master')
        .select('company_master')
        .range(1000, 1999);

    console.log(`Page 2 (1000-1999): ${page2?.length}`);

    // Try fetching larger range 0-5000
    const { data: largeBatch, error } = await supabase
        .from('company_master')
        .select('company_master')
        .range(0, 4999);

    if (error) console.log('Large batch error:', error.message);
    console.log(`Large Batch (0-4999): ${largeBatch?.length}`);
}

testPagination();
