'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { adminAuthClient } from '@/lib/supabase/admin'
import { triggerCandidateRefresh } from '@/app/actions/n8n-actions'
import { getCheckedStatus } from '@/lib/candidate-utils'
import { getN8nUrl } from './admin-actions'
import { v4 as uuidv4 } from 'uuid'

const supabase = adminAuthClient as any

export type OrgNode = {
    node_id: string
    name: string
    title: string
    parent_name: string | null
    matched_candidate_id: string | null
    candidate_photo?: string | null
    candidate_id?: string | null
    linkedin?: string | null
    checked?: string | null
    children?: OrgNode[]
}

export type RawOrgNode = {
    node_id: string
    upload_id: string
    name: string
    title: string | null
    parent_name: string | null
    matched_candidate_id: string | null
    linkedin: string | null
    created_at: string
    candidate?: {
        first_name?: string
        last_name?: string
        name?: string
        photo: string | null
        linkedin?: string | null
        checked?: string | null
        candidate_id?: string | null
    } | null
}

export async function fetchOrgChartUploads() {
    const { data, error } = await supabase
        .from('org_chart_uploads')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching uploads:', error)
        return []
    }
    return data
}

/**
 * Helper to fetch candidates by multiple criteria safely (V7 - Schema Aligned)
 */
async function fetchCandidatesRobust(ids: string[], names: string[]) {
    const client = adminAuthClient as any
    const allCandidates: any[] = []

    // Exact columns from DB: candidate_id, photo, name, linkedin, checked
    const selectStr = 'candidate_id, photo, name, linkedin, checked'

    // 1. Fetch by IDs
    if (ids.length > 0) {
        const { data, error } = await client
            .from('Candidate Profile')
            .select(selectStr)
            .in('candidate_id', ids)

        if (error) {
            console.error('[OrgChart] Error fetching by IDs:', error.message, error.details)
        } else if (data) {
            allCandidates.push(...data)
        }
    }

    // 2. Fetch by Names
    if (names.length > 0) {
        const { data, error } = await client
            .from('Candidate Profile')
            .select(selectStr)
            .in('name', names)

        if (error) {
            console.error('[OrgChart] Error fetching by Names:', error.message, error.details)
        } else if (data) {
            // Merge results, avoid duplicates
            data.forEach((c: any) => {
                if (!allCandidates.find(existing => existing.candidate_id === c.candidate_id)) {
                    allCandidates.push(c)
                }
            })
        }
    }

    return allCandidates
}

export async function getOrgNodesRaw(uploadId: string): Promise<RawOrgNode[]> {
    const { data: nodes, error } = await supabase
        .from('all_org_nodes')
        .select('*')
        .eq('upload_id', uploadId)
        .order('name', { ascending: true })

    if (error) throw error

    const candidateIds = nodes
        .filter((n: any) => n.matched_candidate_id)
        .map((n: any) => n.matched_candidate_id?.trim())
        .filter(Boolean)

    const candidateNames = nodes
        .map((n: any) => n.name?.trim())
        .filter(Boolean)

    const idMap = new Map<string, any>()
    const nameMap = new Map<string, any>()

    const candidates = await fetchCandidatesRobust(candidateIds, candidateNames)

    candidates.forEach((c: any) => {
        const cId = c.candidate_id?.trim().toUpperCase();
        const cName = c.name?.trim().toLowerCase();

        if (cId) idMap.set(cId, c)
        if (cName) nameMap.set(cName, c)
    })

    return nodes.map((n: any) => {
        const targetId = n.matched_candidate_id?.trim().toUpperCase();
        const targetName = n.name?.trim().toLowerCase();

        let candidate = targetId ? idMap.get(targetId) : null
        if (!candidate && targetName) {
            candidate = nameMap.get(targetName)
        }

        return {
            ...n,
            candidate: candidate ? {
                name: candidate.name,
                photo: candidate.photo,
                linkedin: candidate.linkedin || n.linkedin, // Prefer candidate's linkedin, fallback to node's
                checked: candidate.checked,
                candidate_id: candidate.candidate_id
            } : (n.linkedin ? {
                name: n.name,
                photo: null,
                linkedin: n.linkedin,
                checked: null,
                candidate_id: null
            } : null)
        };
    })
}

export async function createOrgNode(uploadId: string, node: Omit<RawOrgNode, 'node_id' | 'created_at' | 'upload_id' | 'candidate'>) {
    const { data, error } = await supabase
        .from('all_org_nodes')
        .insert({
            upload_id: uploadId,
            name: node.name,
            title: node.title,
            parent_name: node.parent_name,
            matched_candidate_id: node.matched_candidate_id,
            linkedin: node.linkedin
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath('/org-chart')
    return data
}

export async function searchCandidates(query: string) {
    const { data, error } = await supabase
        .from('Candidate Profile')
        .select('candidate_id, photo, name')
        .or(`name.ilike.%${query}%,candidate_id.ilike.%${query}%`)
        .limit(10)

    if (error) throw error
    return data.map((c: any) => ({
        id: c.candidate_id,
        name: c.name,
        photo: c.photo
    }))
}

export async function updateOrgNode(nodeId: string, updates: Partial<RawOrgNode>) {
    const { error } = await supabase
        .from('all_org_nodes')
        .update({
            name: updates.name,
            title: updates.title,
            parent_name: updates.parent_name,
            matched_candidate_id: updates.matched_candidate_id,
            linkedin: updates.linkedin
        })
        .eq('node_id', nodeId)

    if (error) throw error

    // Trigger webhook if linkedin was updated to a LinkedIN profile
    if (updates.linkedin && getCheckedStatus(updates.linkedin) === 'LinkedIN profile') {
        const { data: node } = await supabase.from('all_org_nodes').select('name, node_id').eq('node_id', nodeId).single()
        if (node) {
            await triggerCandidateRefresh([{ id: updates.matched_candidate_id || `node-${nodeId}`, name: node.name, linkedin: updates.linkedin }], 'System (OrgChart Update)')
        }
    }

    revalidatePath('/org-chart')
}

export async function bulkCreateOrgProfiles(uploadId: string) {
    try {
        // 1. Fetch all unmatched nodes for this upload
        const { data: nodes, error: nodesError } = await supabase
            .from('all_org_nodes')
            .select('node_id, name, title, linkedin')
            .eq('upload_id', uploadId)
            .is('matched_candidate_id', null)

        if (nodesError) throw nodesError
        if (!nodes || nodes.length === 0) return { success: true, count: 0 }

        // Fetch upload details to get Company Master name
        const { data: uploadData } = await supabase
            .from('org_chart_uploads')
            .select('company_name')
            .eq('upload_id', uploadId)
            .single()

        const masterCompany = uploadData?.company_name || 'Unknown'

        const count = nodes.length

        // 2. Reserve Candidate IDs
        const { data: idRange, error: rpcError } = await supabase.rpc('reserve_candidate_ids', { batch_size: count })
        if (rpcError || !idRange || idRange.length === 0) throw new Error('ID Reservation Failed')

        const startId = idRange[0].start_id
        const candidatesToRefresh: { id: string, name: string, linkedin: string }[] = []

        // 3. Prepare Batch Data
        const candidateProfiles = nodes.map((node: any, index: number) => {
            const numericId = startId + index
            const newId = `C${numericId.toString().padStart(5, '0')}`

            if (node.linkedin && getCheckedStatus(node.linkedin) === 'LinkedIN profile') {
                candidatesToRefresh.push({ id: newId, name: node.name, linkedin: node.linkedin })
            }

            return {
                candidate_id: newId,
                name: node.name,
                linkedin: node.linkedin || null,
                checked: getCheckedStatus(node.linkedin),
                created_date: new Date().toISOString(),
                modify_date: new Date().toISOString()
            }
        })

        const candidateEnhancements = nodes.map((node: any, index: number) => {
            const numericId = startId + index
            const newId = `C${numericId.toString().padStart(5, '0')}`
            return {
                candidate_id: newId,
                name: node.name,
                linkedin_url: node.linkedin || null,
                education_summary: node.title ? `Target Position: ${node.title}` : null
            }
        })

        const { error: pError } = await supabase.from('Candidate Profile').insert(candidateProfiles)
        if (pError) throw pError

        const { error: eError } = await supabase.from('candidate_profile_enhance').insert(candidateEnhancements)
        if (eError) throw eError

        // Prepare and insert backgrounds (experiences) for non-LinkedIn users
        const directExperiences = nodes.map((node: any, index: number) => {
            const numericId = startId + index
            const newId = `C${numericId.toString().padStart(5, '0')}`

            if (!node.linkedin) {
                return {
                    candidate_id: newId,
                    name: node.name,
                    company: masterCompany,
                    position: node.title || 'Unknown Position',
                    start_date: null,
                    end_date: null,
                    is_current_job: 'Current',
                    row_status: 'Active'
                }
            }
            return null
        }).filter(Boolean)

        if (directExperiences.length > 0) {
            const { error: expError } = await supabase.from('candidate_experiences').insert(directExperiences)
            if (expError) {
                console.error('[BulkCreate] Experience Error:', expError)
                // Non-blocking but log it
            }
        }

        // 5. Update Org Nodes to link them
        for (let i = 0; i < nodes.length; i++) {
            const newId = candidateProfiles[i].candidate_id
            await supabase.from('all_org_nodes').update({ matched_candidate_id: newId }).eq('node_id', nodes[i].node_id)
        }

        // 6. Trigger Webhook for all qualifying candidates
        if (candidatesToRefresh.length > 0) {
            await triggerCandidateRefresh(candidatesToRefresh, 'System (OrgChart Bulk)')
        }

        revalidatePath('/org-chart')
        return { success: true, count, webhookCount: candidatesToRefresh.length }

    } catch (err: any) {
        console.error('[BulkCreate] Error:', err)
        throw err
    }
}

/**
 * Creates a single profile from an OrgChart node in the background.
 */
export async function createSingleOrgProfile(nodeId: string) {
    try {
        // 1. Fetch Node Data
        const { data: node, error: nodeError } = await supabase
            .from('all_org_nodes')
            .select('*')
            .eq('node_id', nodeId)
            .single()

        if (nodeError || !node) throw new Error('Node not found')
        if (node.matched_candidate_id) throw new Error('Candidate already matched')

        // 2. Fetch Master Company Name
        const { data: uploadData } = await supabase
            .from('org_chart_uploads')
            .select('company_name')
            .eq('upload_id', node.upload_id)
            .single()

        const masterCompany = uploadData?.company_name || 'Unknown'

        // 3. Reserve Candidate ID
        const { data: idRange, error: rpcError } = await supabase.rpc('reserve_candidate_ids', { batch_size: 1 })
        if (rpcError || !idRange || idRange.length === 0) throw new Error('ID Reservation Failed')

        const numericId = idRange[0].start_id
        const newCandidateId = `C${numericId.toString().padStart(5, '0')}`
        const now = new Date().toISOString()

        // 4. Prepare Data
        const profileData = {
            candidate_id: newCandidateId,
            name: node.name,
            linkedin: node.linkedin || null,
            checked: getCheckedStatus(node.linkedin),
            created_date: now,
            modify_date: now
        }

        const enhanceData = {
            candidate_id: newCandidateId,
            name: node.name,
            current_position: node.title || null,
            current_company: masterCompany,
            linkedin_url: node.linkedin || null,
            education_summary: node.title ? `Target Position: ${node.title}` : null
        }

        // 5. Database Pipeline
        // Profile
        const { error: pError } = await supabase.from('Candidate Profile').insert(profileData)
        if (pError) throw pError

        // Enhance
        await supabase.from('candidate_profile_enhance').insert(enhanceData)

        // Experiences (Only if NO LinkedIn)
        let mode: 'n8n' | 'direct' = 'direct'
        if (!node.linkedin) {
            const expData = {
                candidate_id: newCandidateId,
                name: node.name,
                company: masterCompany,
                position: node.title || 'Unknown Position',
                start_date: null,
                end_date: null,
                is_current_job: 'Current',
                row_status: 'Active'
            }
            await supabase.from('candidate_experiences').insert(expData)
        } else if (getCheckedStatus(node.linkedin) === 'LinkedIN profile') {
            // Trigger Webhook
            await triggerCandidateRefresh([{ id: newCandidateId, name: node.name, linkedin: node.linkedin }], 'System (OrgChart Single Create)')
            mode = 'n8n'
        }

        // 6. Link Node to Candidate
        await supabase.from('all_org_nodes').update({ matched_candidate_id: newCandidateId }).eq('node_id', nodeId)

        revalidatePath('/org-chart')
        return { success: true, candidateId: newCandidateId, mode }

    } catch (err: any) {
        console.error('[CreateSingle] Error:', err)
        throw err
    }
}

export async function importOrgChart(companyName: string, formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) throw new Error('No file provided')

        // 1. Generate Upload ID (db + 6 random hex)
        const uploadId = 'db' + Math.random().toString(16).slice(2, 8)

        // 2. Upload to Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${uploadId}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('org-charts')
            .upload(fileName, file)

        if (uploadError) {
            console.error('[ImportOrg] Upload Error:', uploadError)
            throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // 3. Get Public URL
        const { data: urlData } = supabase.storage
            .from('org-charts')
            .getPublicUrl(fileName)

        const publicUrl = urlData.publicUrl

        // 4. Trigger Webhook
        const config = await getN8nUrl('OrgChart Workflow')
        if (config) {
            const payload = {
                upload_id: uploadId,
                company_master: companyName,
                image_filename: publicUrl
            }

            console.log('[ImportOrg] Triggering Webhook:', config.url)
            const response = await fetch(config.url, {
                method: config.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                console.error('[ImportOrg] Webhook Failed:', response.status)
            }
        } else {
            console.warn('[ImportOrg] Webhook "OrgChart Workflow" not configured')
        }

        revalidatePath('/org-chart')
        return { success: true, uploadId, fileName }

    } catch (err: any) {
        console.error('[ImportOrg] Error:', err)
        return { success: false, error: err.message }
    }
}

export async function fetchOrgChartData(uploadId: string) {
    const { data: nodes, error } = await supabase
        .from('all_org_nodes')
        .select('*')
        .eq('upload_id', uploadId)

    if (error) throw error
    if (!nodes || nodes.length === 0) return null

    const candidateIds = nodes
        .filter((n: any) => n.matched_candidate_id)
        .map((n: any) => n.matched_candidate_id?.trim())
        .filter(Boolean)

    const candidateNames = nodes
        .map((n: any) => n.name?.trim())
        .filter(Boolean)

    const idMap = new Map<string, any>()
    const nameMap = new Map<string, any>()

    const candidates = await fetchCandidatesRobust(candidateIds, candidateNames)

    console.log(`[OrgChart] fetchOrgChartData: Matches found in DB: ${candidates.length}`)

    candidates.forEach((c: any) => {
        const cId = c.candidate_id?.trim().toUpperCase();
        const cName = c.name?.trim().toLowerCase();
        if (cId) idMap.set(cId, c)
        if (cName) nameMap.set(cName, c)
    })

    const nodeMap = new Map<string, OrgNode>()
    const rawData = nodes.map((n: any) => {
        const targetId = n.matched_candidate_id?.trim().toUpperCase()
        const targetName = n.name?.trim().toLowerCase()

        let candidate = targetId ? idMap.get(targetId) : null
        if (!candidate && targetName) {
            candidate = nameMap.get(targetName)
        }

        if (candidate) {
            console.log(`[OrgChart] MATCH SUCCESS: Node '${n.name}' -> Candidate '${candidate.name}'`)
        }

        const nodeObj: OrgNode = {
            ...n,
            candidate_photo: candidate?.photo || null,
            candidate_id: candidate?.candidate_id || null,
            linkedin: candidate?.linkedin || n.linkedin || null, // Logic: UI shows LinkedIn from Candidate OR Node
            checked: candidate?.checked || null,
            children: []
        }
        nodeMap.set(n.name, nodeObj)
        return nodeObj
    })

    const rootNodes: OrgNode[] = []
    rawData.forEach((node: any) => {
        if (!node.parent_name || node.parent_name.trim() === '') {
            rootNodes.push(node)
        } else {
            const parent = nodeMap.get(node.parent_name)
            if (parent) {
                parent.children = parent.children || []
                parent.children.push(node)
            } else {
                rootNodes.push(node)
            }
        }
    })

    if (rootNodes.length === 1) return rootNodes[0]
    if (rootNodes.length > 1) {
        return {
            node_id: 'root-wrapper',
            name: 'Organization',
            title: 'Chart',
            parent_name: null,
            matched_candidate_id: null,
            children: rootNodes
        }
    }
    return null
}
