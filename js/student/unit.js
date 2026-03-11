document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        window.location.href = 'app.html';
        return;
    }

    setTimeout(() => loadUnit(id), 500);
});

async function loadUnit(id) {
    const titleEl = document.getElementById('unit-title');
    const crumbEl = document.getElementById('breadcrumb');
    const container = document.getElementById('chapters-container');
    const backBtn = document.getElementById('back-btn');

    // Fetch Unit + Subject
    const { data: unit, error: uErr } = await window.supabaseClient
        .from('units')
        .select('*, subjects(id, name)')
        .eq('id', id)
        .single();

    if (uErr || !unit) {
        titleEl.textContent = 'Unit not found';
        crumbEl.textContent = 'Error';
        container.innerHTML = '<p style="color:var(--error-color)">Redirecting...</p>';
        setTimeout(() => window.location.href = 'app.html', 2000);
        return;
    }

    titleEl.textContent = unit.name;
    crumbEl.innerHTML = `<a href="app.html" style="color: var(--primary-color); text-decoration: none;">Subjects</a> &gt; <a href="subject.html?id=${unit.subjects.id}" style="color: var(--primary-color); text-decoration: none;">${unit.subjects.name}</a> &gt; ${unit.name}`;
    backBtn.href = `subject.html?id=${unit.subjects.id}`;

    // Load Chapters
    const { data: chapters, error: cErr } = await window.supabaseClient
        .from('chapters')
        .select('*')
        .eq('unit_id', id)
        .eq('is_active', true)
        .order('order_index');

    if (cErr || !chapters || chapters.length === 0) {
        container.innerHTML = '<div class="glass-panel" style="text-align:center; padding: 40px; color: var(--text-secondary);">No chapters available for this unit yet.</div>';
        return;
    }

    container.innerHTML = chapters.map(c => `
        <a href="chapter.html?id=${c.id}" style="text-decoration: none; display: block; filter: brightness(1); transition: filter 0.2s;">
            <div class="glass-panel" style="padding: 24px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary-color);">
                <div>
                    <h3 style="font-size: 1.3rem; color: var(--text-primary); margin-bottom: 8px;">${c.name}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${c.description || 'Dive into this chapter.'}</p>
                </div>
                <div style="color: var(--primary-color);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </div>
            </div>
        </a>
    `).join('');
}
