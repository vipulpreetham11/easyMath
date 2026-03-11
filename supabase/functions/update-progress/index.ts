import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)

        if (!user) throw new Error('Unauthorized')

        const { chapter_id, action, note_id } = await req.json()
        if (!chapter_id) throw new Error("Missing chapter_id")

        // Fetch existing
        const { data: prog } = await supabase
            .from('progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('chapter_id', chapter_id)
            .single()

        let payload: any = {
            last_opened_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        if (action === 'complete_notes') {
            payload.notes_completed = true;
        }

        if (prog) {
            await supabase.from('progress').update(payload).eq('id', prog.id)
        } else {
            payload.user_id = user.id
            payload.chapter_id = chapter_id
            await supabase.from('progress').insert([payload])
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
