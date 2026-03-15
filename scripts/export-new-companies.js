const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Exporting New Companies ---');

    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    const newCompanies = [];

    while (hasMore) {
        const { data, error } = await supabase
            .from('company_master')
            .select('company_id, company_master')
            .gte('company_id', 4338)
            .order('company_id', { ascending: true })
            .range(from, from + batchSize - 1);

        if (error) { console.error('Error:', error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            newCompanies.push(...data);
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }

    console.log(`Found ${newCompanies.length} new companies.`);

    // Generate Markdown content
    let mdContent = `# New Companies Report\n\nThis list contains the ${newCompanies.length} companies that were automatically onboarded.\n\n`;
    mdContent += '| Company ID | Company Name |\n';
    mdContent += '| :--- | :--- |\n';

    newCompanies.forEach(c => {
        mdContent += `| ${c.company_id} | ${c.company_master} |\n`;
    });

    fs.writeFileSync('new_companies_list.md', mdContent);
    console.log('✅ Exported to new_companies_list.md');
}

run();
