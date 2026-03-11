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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need admin rights to bypass RLS
        )

        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const body = await req.json()
        const { test_id, chapter_id, answers, duration_spent_seconds } = body

        // 1. Fetch config to know total questions + marks
        const { data: config } = await supabase.from('chapter_tests').select('*').eq('id', test_id).single()
        if (!config) throw new Error('Test not found')

        // 2. Fetch correct answers for submitted questions
        const qIds = Object.keys(answers)
        let correctCount = 0
        let wrongCount = 0

        if (qIds.length > 0) {
            const { data: qData } = await supabase
                .from('questions')
                .select('id, correct_option')
                .in('id', qIds)

            const qMap = {}
            qData?.forEach(q => qMap[q.id] = q.correct_option)

            qIds.forEach(id => {
                if (answers[id] === qMap[id]) {
                    correctCount++
                } else {
                    wrongCount++
                }
            })
        }

        // 3. Calculate metrics
        let score = (correctCount * config.marks_per_question)
        if (config.negative_marking) {
            score -= wrongCount
        }
        if (score < 0) score = 0 // Floor at 0 if desired

        const totalMarks = config.total_questions * config.marks_per_question
        const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0

        // 4. Save Attempt
        const attemptData = {
            user_id: user.id,
            chapter_id: chapter_id,
            test_id: test_id,
            score: score,
            total_marks: totalMarks,
            correct_count: correctCount,
            wrong_count: wrongCount,
            unattempted_count: config.total_questions - qIds.length,
            accuracy: qIds.length > 0 ? (correctCount / qIds.length) * 100 : 0,
            answers: answers,
            duration_seconds: duration_spent_seconds
        }

        const { data: insData, error: insErr } = await supabase.from('test_attempts').insert([attemptData]).select().single()
        if (insErr) throw insErr

        // 5. Update Progress (Best Score)
        const { data: existingProgress } = await supabase
            .from('progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('chapter_id', chapter_id)
            .single()

        if (existingProgress) {
            let best = Math.max(existingProgress.best_score || 0, pct)
            await supabase.from('progress').update({ best_score: best, last_score: pct, updated_at: new Date() }).eq('id', existingProgress.id)
        } else {
            await supabase.from('progress').insert([{
                user_id: user.id,
                chapter_id: chapter_id,
                best_score: pct,
                last_score: pct
            }])
        }

        return new Response(JSON.stringify({ attempt_id: insData.id, success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
