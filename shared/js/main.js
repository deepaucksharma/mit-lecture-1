// Load and display apps from config.json
async function loadApps() {
    try {
        const response = await fetch('config.json');
        const config = await response.json();
        const appsGrid = document.getElementById('apps-grid');

        config.apps.forEach(app => {
            const card = createAppCard(app);
            appsGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading apps:', error);
        document.getElementById('apps-grid').innerHTML =
            '<p>Error loading applications. Please try again later.</p>';
    }
}

function createAppCard(app) {
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = `${app.path}/`;

    card.innerHTML = `
        <div class="app-icon">${app.icon}</div>
        <h2>${app.title}</h2>
        <p>${app.description}</p>
        <span class="app-category">${app.category}</span>
    `;

    return card;
}

// Load apps when DOM is ready
document.addEventListener('DOMContentLoaded', loadApps);
