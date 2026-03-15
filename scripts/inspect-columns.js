const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function getColumns(tableName) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`Error fetching from ${tableName}:`, error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Columns for ${tableName}:`, Object.keys(data[0]));
    } else {
        // If empty, we can try to get from rpc if available, or just assume common columns
        // Let's try to fetch a single row without a limit if limit 1 fails for some reason
        console.log(`Table ${tableName} is empty or no columns found via select.`);
    }
}

async function run() {
    await getColumns('candidate_experiences');
    await getColumns('company_reference_location');
    await getColumns('company_master');
    await getColumns('company_variation');
}

run();
