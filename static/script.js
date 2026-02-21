let currentPage = 1;
let isFetching = false;

/**
 * Initialize on Load
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchEvents(currentPage);
    setupTheme();
});

/**
 * 1. FETCH & RENDER LOGIC
 * Corrected to handle the { events: [], has_next: bool } structure
 */
async function fetchEvents(page) {
    if (isFetching) return;
    isFetching = true;

    const feed = document.getElementById('feed');
    const pageDisplay = document.querySelector('.page-number');
    const nextBtn = document.querySelector('button[onclick="nextPage()"]');
    const prevBtn = document.querySelector('button[onclick="prevPage()"]');
    
    try {
        const response = await fetch(`/events?page=${page}`);
        const data = await response.json();
        
        feed.innerHTML = ''; // Clear current feed
        
        // Update pagination text
        if (pageDisplay) {
            pageDisplay.textContent = `Page ${page.toString().padStart(2, '0')}`;
        }

        // Logic: Disable buttons based on real data availability
        if (prevBtn) {
            prevBtn.disabled = (page === 1);
            prevBtn.style.opacity = (page === 1) ? "0.4" : "1";
        }
        if (nextBtn) {
            nextBtn.disabled = !data.has_next;
            nextBtn.style.opacity = !data.has_next ? "0.4" : "1";
        }

        // Handle empty state
        if (!data.events || data.events.length === 0) {
            feed.innerHTML = `
                <div class="card glass text-center">
                    <p class="text-secondary">No activity detected on this page.</p>
                </div>`;
            return;
        }

        // Loop through the events array
        data.events.forEach(event => {
            const actionClass = event.action.toLowerCase().replace('_', '');
            
            const card = document.createElement('div');
            card.className = `card ${actionClass}`;
            
            card.innerHTML = `
                <div class="card-content">
                    <div class="card-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h4 class="font-weight-bold" style="margin:0;">${event.author}</h4>
                        <span class="badge ${getBadgeType(event.action)}">${event.action}</span>
                    </div>
                    
                    <div class="event-details mb-2">
                        <p class="text-secondary" style="font-size: 0.9rem;">
                            <i class="bi bi-shuffle"></i> 
                            From <code>${event.from_branch || 'main'}</code> 
                            to <code>${event.to_branch}</code>
                        </p>
                    </div>

                    <div class="card-footer-row" style="margin-top:15px; border-top: 1px solid var(--border-color); padding-top:10px;">
                        <small class="text-muted">
                            <i class="bi bi-clock-history"></i> ${event.timestamp}
                        </small>
                    </div>
                </div>
            `;
            feed.appendChild(card);
        });
    } catch (error) {
        console.error("Critical: Could not sync with activity stream.", error);
        feed.innerHTML = `<p class="text-error">Failed to connect to the server.</p>`;
    } finally {
        isFetching = false;
    }
}

/**
 * Helper: Badge Styling
 */
function getBadgeType(action) {
    if (action === 'PUSH') return 'badge-primary';
    if (action === 'MERGE') return 'badge-primary'; 
    if (action === 'PULL_REQUEST') return 'badge-outline';
    return 'badge-outline';
}

/**
 * 2. PAGINATION CONTROLS
 */
function nextPage() {
    currentPage++;
    fetchEvents(currentPage);
    smoothScrollToTop();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        fetchEvents(currentPage);
        smoothScrollToTop();
    }
}

function smoothScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 3. THEME MANAGEMENT
 */
function setupTheme() {
    const toggle = document.getElementById('themeToggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme-preference') || 'dark-theme';
    
    body.classList.remove('dark-theme', 'light-theme');
    body.classList.add(savedTheme);
    if(toggle) toggle.checked = (savedTheme === 'dark-theme');

    toggle?.addEventListener('change', () => {
        const newTheme = toggle.checked ? 'dark-theme' : 'light-theme';
        body.classList.replace(toggle.checked ? 'light-theme' : 'dark-theme', newTheme);
        localStorage.setItem('theme-preference', newTheme);
    });
}