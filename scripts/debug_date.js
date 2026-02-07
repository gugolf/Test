const fs = require('fs');
const path = require('path');

// Load .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = fs.readFileSync(envPath, { encoding: 'utf8' });
    envConfig.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
} catch (e) {
    console.error("Error loading .env.local", e);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking Candidate Profile schema and data...");

    // Fetch 5 rows to see what modify_date looks like
    const { data, error } = await supabase
        .from('Candidate Profile')
        .select('candidate_id, modify_date, created_date')
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Sample Data:");
    console.table(data);

    // Check type if possible (indirectly via behavior)
    // Try a GT query with string logic
    const { count, error: countError } = await supabase
        .from('Candidate Profile')
        .select('*', { count: 'exact', head: true })
        .gt('modify_date', '2026-01-01'); // Should only match recent if ISO

    console.log("Count > 2026-01-01:", count);
}

checkData();
