
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

async function checkCompanyMaster() {
    console.log('Checking company_master...');

    // 1. Count Total in company_master
    const { count: masterCount, error: masterError } = await supabase
        .from('company_master')
        .select('*', { count: 'exact', head: true });

    if (masterError) {
        console.error('Error counting company_master:', masterError);
    } else {
        console.log(`Total in company_master: ${masterCount}`);
    }

    // 2. Count Distinct companies in candidate_experiences
    const { data: expData, error: expError } = await supabase
        .from('candidate_experiences')
        .select('company');

    if (expError) {
        console.error('Error counting candidate_experiences:', expError);
    } else {
        const uniqueCompanies = new Set(expData.map(e => e.company));
        console.log(`Unique companies in candidate_experiences: ${uniqueCompanies.size}`);
    }

    // 3. Sample columns from company_master
    const { data: sampleData, error: sampleError } = await supabase
        .from('company_master')
        .select('*')
        .limit(1);

    if (sampleError) {
        console.error('Error sampling company_master:', sampleError);
    } else {
        console.log('Sample row from company_master:', sampleData[0]);
    }
}

checkCompanyMaster();
