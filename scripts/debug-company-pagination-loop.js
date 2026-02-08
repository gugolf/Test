
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugPaginationLoop() {
    console.log('--- Testing Pagination Loop ---');

    let allCompanies = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore && allCompanies.length < 20000) {
        const { data: chunk, error: companyError } = await supabase
            .from('company_master')
            .select('company_master')
            .order('company_master', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (companyError) {
            console.error("Error fetching company master page", page, companyError);
            break;
        }

        if (chunk && chunk.length > 0) {
            console.log(`Page ${page}: Fetched ${chunk.length} rows`);
            allCompanies = allCompanies.concat(chunk);
            if (chunk.length < pageSize) {
                hasMore = false;
            }
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Total Fetched: ${allCompanies.length}`);

    const uniqueNames = new Set(allCompanies.map(c => c.company_master).filter(n => n));
    console.log(`Unique Names: ${uniqueNames.size}`);
}

debugPaginationLoop();
