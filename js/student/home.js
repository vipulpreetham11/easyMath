async function loadDashboard() {
    document.body.classList.remove('page-hidden');
    document.getElementById('auth-loader')?.remove();
    await fetchSubjects();
    await fetchContinueLearning();
}

async function fetchSubjects() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '<div class="loader-container" style="grid-column: 1/-1; text-align: center;"><div class="loader"></div></div>';

    const { data: subjects, error } = await window.supabaseClient
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

    if (error || !subjects || subjects.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); grid-column: 1/-1;">No active subjects found. Please contact an admin.</div>';
        return;
    }

    // We also want to fetch counts of units/chapters. 
    // Since SQL counts require RPC or joining, for a simple MVP we will just show the icon and name.

    container.innerHTML = subjects.map(sub => `
        <a href="subject.html?id=${sub.id}" style="text-decoration: none; display: block;">
            <div class="glass-panel" style="padding: 24px; cursor: pointer; transition: transform 0.2s; height: 100%;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        ${sub.icon || '📚'}
                    </div>
                    <h4 style="font-size: 1.2rem; color: var(--text-primary); transition: color 0.2s;">${sub.name}</h4>
                </div>
                <p style="color: var(--primary-color); font-size: 0.95rem; font-weight: 500;">Explore Syllabus &rarr;</p>
            </div>
        </a>
    `).join('');
}

async function fetchContinueLearning() {
    const el = document.getElementById('continue-learning-card');

    if (!currentUser) return;

    // Fetch most recent progress
    const { data, error } = await window.supabaseClient
        .from('progress')
        .select(`
            *,
            chapters:chapter_id(id, name, units:unit_id(id, name, subjects:subject_id(id, name)))
        `)
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data || !data.chapters) {
        if (el) el.style.display = 'none';
        return;
    }

    if (el) {
        el.style.display = 'block';
        el.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 1.5rem; color: var(--text-primary); margin-bottom: 8px;">Resume Learning</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">Jump back into <strong style="color:var(--text-primary);">${data.chapters.name}</strong> (${data.chapters.units.subjects.name})</p>
                    
                    <div style="display: flex; gap: 24px;">
                        <div>
                            <span style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">Best Score</span>
                            <div style="font-size: 1.4rem; font-weight: 700; color: #10b981;">${data.best_score || 0}%</div>
                        </div>
                        <div>
                            <span style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">Notes Read</span>
                            <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">${data.notes_completed ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" style="padding: 16px 32px; font-size: 1.1rem; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);" onclick="window.location.href='app.html?chapter_id=${data.chapter_id}'">
                    Continue &rarr;
                </button>
            </div>
        `;
    }
}



