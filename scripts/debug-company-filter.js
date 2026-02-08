
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugCompanyFilter() {
    console.log('--- Debugging Company Filter ---');

    // 1. Fetch exactly like the API
    const { data: companyData, error: companyError } = await supabase
        .from('company_master')
        .select('company_master')
        .order('company_master', { ascending: true })
        .limit(10000);

    if (companyError) {
        console.error('API Query Error:', companyError);
        return;
    }

    const rawCount = companyData.length;
    console.log(`Raw Records Fetched: ${rawCount}`);

    // 2. Simulate cleaning logic
    const getUnique = (data, key) => {
        if (!data) return [];
        return Array.from(new Set(data.map(item => item[key]).filter(val => val !== null && val !== undefined && val !== ""))).sort();
    };

    const processedData = getUnique(companyData, 'company_master');
    console.log(`Processed Unique Count: ${processedData.length}`);

    // 3. Inspect first/last/random
    console.log('first 5:', processedData.slice(0, 5));
    console.log('last 5:', processedData.slice(-5));

    // 4. Check for duplicates in raw data specifically
    const names = companyData.map(c => c.company_master);
    const uniqueNames = new Set(names);
    console.log(`Unique Names Check: ${uniqueNames.size} (Diff: ${names.length - uniqueNames.size})`);
}

debugCompanyFilter();
