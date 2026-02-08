
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('--- Checking candidate_experiences Table ---');
    try {
        const { data, error } = await supabase
            .from('candidate_experiences')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success! Columns found based on result keys:');
            if (data && data.length > 0) {
                console.log(Object.keys(data[0]));
            } else {
                console.log('Table exists but is empty. Cannot determine columns from data.');
                // Try inserting a dummy row to test columns? No, risky.
                // Just try select specific columns to check existence
                await checkColumns();
            }
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

async function checkColumns() {
    // Check 'company' vs 'company_name_text'
    const { error: err1 } = await supabase.from('candidate_experiences').select('company').limit(1);
    if (err1) console.log("Column 'company' check:", err1.message);
    else console.log("Column 'company' exists!");

    const { error: err2 } = await supabase.from('candidate_experiences').select('company_name_text').limit(1);
    if (err2) console.log("Column 'company_name_text' check:", err2.message);
    else console.log("Column 'company_name_text' exists!");
}

checkTable();
