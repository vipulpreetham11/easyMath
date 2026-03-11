document.addEventListener('DOMContentLoaded', () => {
    const resultRaw = sessionStorage.getItem('test_result');

    if (!resultRaw) {
        document.getElementById('load-msg').textContent = 'No test result found. Please take a test first.';
        document.getElementById('load-msg').style.color = 'var(--error-color)';
        return;
    }

    const result = JSON.parse(resultRaw);
    renderUI(result);
    renderReview(result.review || []);
});

function renderUI(r) {
    document.getElementById('loader-state').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';

    // Title
    document.getElementById('r-title').textContent = r.test_name || 'Test Completed!';

    // Back button
    if (r.chapter_id) {
        document.getElementById('back-btn').href = 'app.html';
        document.getElementById('retry-btn').onclick = () => window.location.href = 'app.html';
    }

    // Score percentage
    const pct = r.percentage || 0;
    document.getElementById('r-percent').textContent = `${pct.toFixed(0)}%`;

    // Circle color based on score
    let color = '#ef4444'; // red
    if (pct >= 80) color = '#10b981';      // green
    else if (pct >= 50) color = '#f59e0b'; // amber

    const circle = document.getElementById('score-circle');
    circle.style.borderColor = color;
    document.getElementById('r-percent').style.color = color;

    // Score values
    document.getElementById('r-score-val').textContent = r.score;
    document.getElementById('r-score-val').style.color = color;
    document.getElementById('r-total-marks').textContent = r.total_marks;

    // Stats
    document.getElementById('r-attempted').textContent = r.questions_attempted;
    document.getElementById('r-correct').textContent = r.correct_answers;
    document.getElementById('r-wrong').textContent = r.incorrect_answers;

    const m = Math.floor(r.duration_seconds / 60);
    const s = r.duration_seconds % 60;
    document.getElementById('r-time').textContent = `${m}m ${s}s`;

    // Accuracy bar
    const total = r.questions_attempted + (r.unattempted || 0);
    let accPct = 0;
    if (r.questions_attempted > 0) {
        accPct = (r.correct_answers / r.questions_attempted) * 100;
    }

    document.getElementById('r-acc-text').textContent = `${accPct.toFixed(0)}%`;

    const correctW = total > 0 ? (r.correct_answers / total) * 100 : 0;
    const wrongW = total > 0 ? (r.incorrect_answers / total) * 100 : 0;
    const skipW = total > 0 ? ((r.unattempted || 0) / total) * 100 : 100;

    document.getElementById('bar-correct').style.width = `${correctW}%`;
    document.getElementById('bar-wrong').style.width = `${wrongW}%`;
    document.getElementById('bar-skip').style.width = `${skipW}%`;
}

function renderReview(review) {
    const container = document.getElementById('review-container');
    if (!review || review.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No review data available.</p>';
        return;
    }

    container.innerHTML = review.map(q => {
        let cardClass = 'review-card';
        let badgeClass = '';
        let badgeText = '';

        if (!q.is_attempted) {
            cardClass += ' skipped-card';
            badgeClass = 'badge-skipped';
            badgeText = 'Skipped';
        } else if (q.is_correct) {
            cardClass += ' correct-card';
            badgeClass = 'badge-correct';
            badgeText = 'Correct';
        } else {
            cardClass += ' wrong-card';
            badgeClass = 'badge-wrong';
            badgeText = 'Wrong';
        }

        const options = ['a', 'b', 'c', 'd'];
        const optionsHtml = options.map(opt => {
            let classes = 'review-option';
            let icon = '';

            if (opt === q.correct_option) {
                classes += ' is-correct';
                icon = '✓';
            } else if (opt === q.user_answer && !q.is_correct) {
                classes += ' is-wrong';
                icon = '✗';
            }

            return `
                <div class="${classes}">
                    <span class="opt-marker">${opt.toUpperCase()}${icon ? ' ' + icon : ''}</span>
                    <span>${q['option_' + opt]}</span>
                </div>
            `;
        }).join('');

        const explanationHtml = q.explanation
            ? `<div class="review-explanation">💡 ${q.explanation}</div>`
            : '';

        return `
            <div class="${cardClass}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <span style="font-weight: 700; color: var(--text-secondary);">Q${q.index}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 0.7rem; color: var(--text-secondary);">${(q.source || '').toUpperCase()} · ${(q.difficulty || '').toUpperCase()}</span>
                        <span class="review-badge ${badgeClass}">${badgeText}</span>
                    </div>
                </div>
                <p style="font-size: 1.05rem; line-height: 1.6; margin-bottom: 16px;">${q.question_text}</p>
                ${optionsHtml}
                ${explanationHtml}
            </div>
        `;
    }).join('');
}


