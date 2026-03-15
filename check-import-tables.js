require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
    const tables = ['Candidate Profile', 'resume_uploads', 'csv_upload_logs'];
    
    for (const table of tables) {
        console.log(`--- Checking Table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error checking ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns in ${table}:`, Object.keys(data[0]).join(", "));
        } else {
            console.log(`${table} is empty or not accessible.`);
        }
        console.log("\n");
    }
}

checkTables();
