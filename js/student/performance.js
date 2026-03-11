document.addEventListener('DOMContentLoaded', loadPerformance);

async function loadPerformance() {
  let attempts2 = 0;
  while (!window.currentUser && attempts2 < 20) {
    await new Promise(r => setTimeout(r, 100));
    attempts2++;
  }
  if (!window.currentUser) { 
    document.getElementById('loader-state').innerHTML = '<p style="color:var(--error-color)">Please log in.</p>';
    return; 
  }

    // Fetch all test attempts for this user, joined with chapter_tests -> chapters -> units -> subjects
    const { data: attempts, error } = await window.supabaseClient
        .from('test_attempts')
        .select(`
            id,
            score,
            total_marks,
            correct_count,
            wrong_count,
            unattempted_count,
            accuracy,
            submitted_at,
            chapter_tests!inner(
                chapter_id,
                test_name,
                chapters!inner(
                    id, name,
                    units!inner(
                        id, name,
                        subjects!inner(id, name)
                    )
                )
            )
        `)
        .eq('user_id', window.currentUser.id)
        .order('submitted_at', { ascending: false });

    document.getElementById('loader-state').style.display = 'none';

    if (error || !attempts || attempts.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        return;
    }

    document.getElementById('perf-content').style.display = 'block';

    renderOverallStats(attempts);
    renderHistory(attempts.slice(0, 10));
    renderWeakChapters(attempts);
    renderSubjectBreakdown(attempts);
}

function renderOverallStats(attempts) {
    const totalTests = attempts.length;
    const totalQs = attempts.reduce((sum, a) => sum + ((a.correct_count || 0) + (a.wrong_count || 0)), 0);
    const avgAcc = attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / (totalTests || 1);
    const bestScore = totalTests > 0 ? Math.max(...attempts.map(a => a.accuracy || 0)) : 0;

    document.getElementById('s-total-tests').textContent = totalTests;
    document.getElementById('s-avg-acc').textContent = `${avgAcc.toFixed(0)}%`;
    document.getElementById('s-best-score').textContent = `${bestScore.toFixed(0)}%`;
    document.getElementById('s-total-qs').textContent = totalQs;
}

function renderHistory(attempts) {
    const tbody = document.getElementById('history-body');

    tbody.innerHTML = attempts.map(a => {
        const chapterName = a.chapter_tests?.chapters?.name || 'Unknown';
        const pct = a.accuracy || 0;
        const date = new Date(a.submitted_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        let pillClass = 'acc-red';
        if (pct >= 80) pillClass = 'acc-green';
        else if (pct >= 50) pillClass = 'acc-yellow';

        return `
            <tr>
                <td style="font-weight: 500;">${chapterName}</td>
                <td>${a.score}</td>
                <td>${a.total_marks}</td>
                <td><span class="acc-pill ${pillClass}">${pct.toFixed(0)}%</span></td>
                <td style="color: var(--text-secondary);">${date}</td>
            </tr>
        `;
    }).join('');
}

function renderWeakChapters(attempts) {
    // Group by chapter_id and compute average percentage
    const chapterMap = {};

    attempts.forEach(a => {
        const ch = a.chapter_tests?.chapters;
        if (!ch) return;
        const cid = ch.id;

        if (!chapterMap[cid]) {
            chapterMap[cid] = {
                name: ch.name,
                chapter_id: cid,
                scores: []
            };
        }
        chapterMap[cid].scores.push(a.accuracy || 0);
    });

    const weakChapters = Object.values(chapterMap)
        .map(c => ({
            ...c,
            avg: c.scores.reduce((s, v) => s + v, 0) / c.scores.length
        }))
        .filter(c => c.avg < 50)
        .sort((a, b) => a.avg - b.avg);

    if (weakChapters.length === 0) return;

    document.getElementById('weak-section').style.display = 'block';
    const grid = document.getElementById('weak-grid');

    grid.innerHTML = weakChapters.map(c => `
        <div class="weak-card">
            <h4>${c.name}</h4>
            <p class="weak-score">Average: ${c.avg.toFixed(0)}% across ${c.scores.length} attempt${c.scores.length > 1 ? 's' : ''}</p>
            <a href="app.html" class="btn btn-outline" style="padding: 10px 20px; font-size: 0.9rem; border-color: #ef4444; color: #fca5a5;">
                Retry Chapter →
            </a>
        </div>
    `).join('');
}

function renderSubjectBreakdown(attempts) {
    // Group by subject
    const subjectMap = {};

    attempts.forEach(a => {
        const sub = a.chapter_tests?.chapters?.units?.subjects;
        if (!sub) return;
        const sid = sub.id;

        if (!subjectMap[sid]) {
            subjectMap[sid] = {
                name: sub.name,
                scores: [],
                best: 0,
                totalTests: 0
            };
        }

        subjectMap[sid].scores.push(a.accuracy || 0);
        subjectMap[sid].totalTests++;
        if ((a.accuracy || 0) > subjectMap[sid].best) {
            subjectMap[sid].best = a.accuracy;
        }
    });

    const subjects = Object.values(subjectMap);
    if (subjects.length === 0) return;

    document.getElementById('subject-section').style.display = 'block';
    const grid = document.getElementById('subject-grid');

    grid.innerHTML = subjects.map(s => {
        const avg = s.scores.reduce((sum, v) => sum + v, 0) / s.scores.length;
        let barColor = '#ef4444';
        if (avg >= 80) barColor = '#10b981';
        else if (avg >= 50) barColor = '#f59e0b';

        return `
            <div class="subject-card">
                <h4>
                    <span style="font-size: 1.3rem;">“</span>
                    ${s.name}
                </h4>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: var(--text-secondary);">Average Accuracy</span>
                    <span style="font-weight: 700; color: ${barColor};">${avg.toFixed(0)}%</span>
                </div>
                <div class="acc-bar-wrap">
                    <div class="acc-bar-fill" style="width: ${avg}%; background: ${barColor};"></div>
                </div>
                <div class="subject-meta">
                    <span>Tests: <strong>${s.totalTests}</strong></span>
                    <span>Best: <strong style="color: #10b981;">${s.best.toFixed(0)}%</strong></span>
                </div>
            </div>
        `;
    }).join('');
}


