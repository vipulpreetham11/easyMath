let chapterId = null;
let testConfig = null;
let questions = [];
let answers = {};   // { questionId: 'a'|'b'|'c'|'d' }
let marked = {};    // { questionId: true/false }
let currentIndex = 0;
let timeRemaining = 0;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    chapterId = params.get('chapter_id');

    if (!chapterId) {
        window.location.href = 'app.html';
        return;
    }

    setTimeout(initTestSetup, 500);
});

async function initTestSetup() {
    const msgEl = document.getElementById('setup-message');
    const errEl = document.getElementById('setup-error');

    // 1. Fetch Test Config
    const { data: config, error: cErr } = await window.supabaseClient
        .from('chapter_tests')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .single();

    if (cErr || !config) {
        errEl.textContent = "No active test configuration found for this chapter.";
        errEl.style.display = 'block';
        document.getElementById('loader').style.display = 'none';
        return;
    }

    testConfig = config;
    msgEl.textContent = `Generating ${config.total_questions} questions...`;

    // 2. Fetch Questions (Practice + PYQ pools)
    let fetchedQuestions = [];

    // Practice pool
    if (config.practice_count > 0) {
        const { data: pracQ } = await window.supabaseClient
            .from('questions')
            .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, source')
            .eq('chapter_id', chapterId)
            .eq('source', 'practice')
            .eq('is_active', true)
            .limit(config.practice_count * 3);

        if (pracQ) {
            fetchedQuestions = fetchedQuestions.concat(
                pracQ.sort(() => 0.5 - Math.random()).slice(0, config.practice_count)
            );
        }
    }

    // PYQ pool
    if (config.pyq_count > 0) {
        const { data: pyqQ } = await window.supabaseClient
            .from('questions')
            .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, source, exam_name, exam_year')
            .eq('chapter_id', chapterId)
            .eq('source', 'pyq')
            .eq('is_active', true)
            .limit(config.pyq_count * 3);

        if (pyqQ) {
            fetchedQuestions = fetchedQuestions.concat(
                pyqQ.sort(() => 0.5 - Math.random()).slice(0, config.pyq_count)
            );
        }
    }

    // Shuffle final array
    questions = fetchedQuestions.sort(() => 0.5 - Math.random());

    if (questions.length === 0) {
        errEl.textContent = "Not enough questions in the database to generate this test.";
        errEl.style.display = 'block';
        document.getElementById('loader').style.display = 'none';
        return;
    }

    document.getElementById('loader').style.display = 'none';
    msgEl.innerHTML = `
        <strong>Test Ready!</strong><br><br>
        ⏱ Duration: <strong>${config.duration_minutes} Minutes</strong><br>
        📝 Questions: <strong>${questions.length}</strong><br>
        📊 Marks per Q: <strong>+${config.marks_per_question}</strong><br>
        ${config.negative_marking
            ? '<span style="color:#ef4444;">⚠ Negative Marking: <strong>-0.25 per wrong answer</strong></span>'
            : '<span style="color:#10b981;">✓ No negative marking</span>'}
    `;
    document.getElementById('start-btn').style.display = 'inline-flex';
}

function startTest() {
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('test-view').style.display = 'block';

    document.getElementById('test-title').textContent = testConfig.test_name || 'Chapter Test';

    timeRemaining = testConfig.duration_minutes * 60;
    updateTimerDisplay();
    timerInterval = setInterval(timerTick, 1000);

    renderGrid();
    loadQuestion(0);
}

function timerTick() {
    timeRemaining--;
    updateTimerDisplay();

    if (timeRemaining <= 300) {
        document.getElementById('timer-display').classList.add('warning');
    }

    if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        submitTest(true);
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, timeRemaining) / 60).toString().padStart(2, '0');
    const secs = (Math.max(0, timeRemaining) % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').textContent = `${mins}:${secs}`;
}

function renderGrid() {
    const grid = document.getElementById('q-grid');
    grid.innerHTML = questions.map((q, i) => {
        let classes = ['q-circle'];
        if (i === currentIndex) classes.push('current');
        if (answers[q.id]) classes.push('answered');
        if (marked[q.id]) classes.push('marked');

        return `<div class="${classes.join(' ')}" onclick="loadQuestion(${i})">${i + 1}</div>`;
    }).join('');

    updateStats();
}

function updateStats() {
    const ansCount = Object.keys(answers).length;
    const markCount = Object.values(marked).filter(v => v).length;

    document.getElementById('stat-ans').textContent = ansCount;
    document.getElementById('stat-mark').textContent = markCount;
    document.getElementById('stat-unvis').textContent = questions.length - ansCount;
}

function loadQuestion(idx) {
    if (idx < 0 || idx >= questions.length) return;

    currentIndex = idx;
    const q = questions[currentIndex];

    document.getElementById('q-no').textContent = `Question ${currentIndex + 1}`;
    document.getElementById('q-meta').textContent = `${q.source.toUpperCase()} · ${(q.difficulty || 'medium').toUpperCase()} · +${testConfig.marks_per_question} Marks`;

    document.getElementById('q-text').textContent = q.question_text;
    document.getElementById('opt-a-text').textContent = q.option_a;
    document.getElementById('opt-b-text').textContent = q.option_b;
    document.getElementById('opt-c-text').textContent = q.option_c;
    document.getElementById('opt-d-text').textContent = q.option_d;

    // Reset selections
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));

    // Restore if answered
    if (answers[q.id]) {
        document.querySelector(`[data-opt="${answers[q.id]}"]`).classList.add('selected');
    }

    // Nav buttons
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('next-btn').textContent = currentIndex === questions.length - 1 ? 'Finish' : 'Next →';

    renderGrid();
}

function selectOption(opt) {
    const q = questions[currentIndex];
    answers[q.id] = opt;

    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-opt="${opt}"]`).classList.add('selected');

    renderGrid();
}

function clearResponse() {
    const q = questions[currentIndex];
    delete answers[q.id];

    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    renderGrid();
}

function toggleMark() {
    const q = questions[currentIndex];
    marked[q.id] = !marked[q.id];
    renderGrid();
}

function navQuestion(dir) {
    if (dir === 1 && currentIndex === questions.length - 1) {
        if (confirm("Are you sure you want to submit the test?")) submitTest();
        return;
    }
    loadQuestion(currentIndex + dir);
}

async function submitTest(auto = false) {
    if (!auto) {
        const unans = questions.length - Object.keys(answers).length;
        if (unans > 0) {
            if (!confirm(`You have ${unans} unanswered question(s). Submit anyway?`)) return;
        }
    }

    clearInterval(timerInterval);
    document.getElementById('submitting-overlay').style.display = 'flex';

    // CLIENT-SIDE SCORING
    let correctCount = 0;
    let wrongCount = 0;
    let unattempted = 0;
    const reviewData = [];

    questions.forEach((q, i) => {
        const userAnswer = answers[q.id] || null;
        const isCorrect = userAnswer === q.correct_option;
        const isAttempted = userAnswer !== null;

        if (isAttempted) {
            if (isCorrect) correctCount++;
            else wrongCount++;
        } else {
            unattempted++;
        }

        reviewData.push({
            index: i + 1,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            user_answer: userAnswer,
            is_correct: isCorrect,
            is_attempted: isAttempted,
            explanation: q.explanation || '',
            source: q.source,
            difficulty: q.difficulty
        });
    });

    let score = correctCount * testConfig.marks_per_question;
    if (testConfig.negative_marking) {
        score -= wrongCount * 0.25;
    }
    if (score < 0) score = 0;

    const totalMarks = questions.length * testConfig.marks_per_question;
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const durationUsed = (testConfig.duration_minutes * 60) - timeRemaining;

    const result = {
        chapter_id: chapterId,
        test_name: testConfig.test_name || 'Chapter Test',
        score: parseFloat(score.toFixed(2)),
        total_marks: totalMarks,
        percentage: parseFloat(percentage.toFixed(1)),
        questions_attempted: correctCount + wrongCount,
        correct_answers: correctCount,
        incorrect_answers: wrongCount,
        unattempted: unattempted,
        duration_seconds: durationUsed,
        negative_marking: testConfig.negative_marking,
        marks_per_question: testConfig.marks_per_question,
        review: reviewData
    };

    // Save to test_attempts (best effort)
    const session = await checkSession();
    if (session) {
        try {
            await window.supabaseClient.from('test_attempts').insert([{
                user_id: session.id,
                chapter_id: chapterId,
                test_id: testConfig.id,
                score: result.score,
                total_marks: result.total_marks,
                correct_count: correctCount,
                wrong_count: wrongCount,
                unattempted_count: unattempted,
                accuracy: Math.round((correctCount / questions.length) * 100),
                answers: JSON.stringify(reviewData)
            }]);
        } catch (e) {
            console.warn('Could not save test attempt:', e);
        }
    }

    // Store result in sessionStorage for the result page
    sessionStorage.setItem('test_result', JSON.stringify(result));

    // Small delay for UX
    setTimeout(() => {
        window.location.href = `test-result.html?chapter_id=${chapterId}`;
    }, 1200);
}
