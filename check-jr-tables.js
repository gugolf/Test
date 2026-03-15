require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkJrTables() {
    // List all tables to find JR related ones
    const { data: tables, error: tableError } = await supabase.rpc('get_tables'); // Hope this exists or I'll just guess names
    
    // If RPC doesn't exist, let's just try names we expect
    const candidateTables = ['job_requisitions', 'requisition_status_log', 'job_requisition_status_logs', 'jr_status_logs'];
    
    for (const table of candidateTables) {
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

checkJrTables();
