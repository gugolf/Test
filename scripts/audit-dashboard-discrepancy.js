const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function getPrimaryJob(experiences) {
    if (!experiences || experiences.length === 0) return null;
    const currents = experiences.filter(e => e.is_current_job === 'Current');
    if (currents.length > 0) {
        return currents.sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0];
    }
    return experiences.sort((a, b) => new Date(b.end_date || b.start_date || 0).getTime() - new Date(a.end_date || a.start_date || 0).getTime())[0];
}

async function audit() {
    console.log('--- Final Discrepancy Audit ---');
    
    // 1. Total Candidates
    const { count: totalCandidates } = await supabase
        .from('Candidate Profile')
        .select('*', { count: 'exact', head: true });
    
    // 2. Fetch all experiences
    let allExps = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
        const { data } = await supabase.from('candidate_experiences').select('*').range(page * pageSize, (page + 1) * pageSize - 1);
        if (data && data.length > 0) {
            allExps = allExps.concat(data);
            page++;
            if (data.length < pageSize) hasMore = false;
        } else { hasMore = false; }
    }

    const grouped = {};
    allExps.forEach(exp => {
        if (!grouped[exp.candidate_id]) grouped[exp.candidate_id] = [];
        grouped[exp.candidate_id].push(exp);
    });

    let dashboardCount = 0;
    let anyExpWithCompanyCount = 0;
    const anyExpWithCompanyIds = new Set();
    const dashboardIds = new Set();

    Object.keys(grouped).forEach(candId => {
        const exps = grouped[candId];
        
        // Logic for any exp with company
        if (exps.some(e => e.company && e.company.trim() !== '')) {
            anyExpWithCompanyCount++;
            anyExpWithCompanyIds.add(candId);
        }

        // Dashboard logic (Primary Job must have company)
        const primary = getPrimaryJob(exps);
        if (primary && primary.company && primary.company.trim() !== '') {
            dashboardCount++;
            dashboardIds.add(candId);
        }
    });

    console.log(`Total Profiles in DB: ${totalCandidates}`);
    console.log(`Dashboard Count (matches screenshot): ${dashboardCount}`);
    console.log(`Candidates with ANY company in ANY exp: ${anyExpWithCompanyCount}`);
    console.log(`Candidates completely missing company data or no exp: ${totalCandidates - anyExpWithCompanyCount}`);
    
    const candidatesInEdgeCase = Array.from(anyExpWithCompanyIds).filter(id => !dashboardIds.has(id));
    console.log(`Edge Case (Have exp but primary job missing company): ${candidatesInEdgeCase.length}`);
}

audit();
