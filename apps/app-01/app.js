// Application 01 - Example Implementation

// Initialize app state
const appState = new AppState({
    greetCount: 0,
    lastGreeted: null
});

// Initialize storage for this app
const storage = new AppStorage('app-01');

// Load previous state
const savedState = {
    greetCount: storage.get('greetCount', 0),
    lastGreeted: storage.get('lastGreeted', null)
};
appState.setState(savedState);

// DOM elements
const nameInput = document.getElementById('nameInput');
const greetButton = document.getElementById('greetButton');
const output = document.getElementById('output');

// Load last greeted name
if (savedState.lastGreeted) {
    nameInput.value = savedState.lastGreeted;
}

// Greet button handler
greetButton.addEventListener('click', () => {
    const name = nameInput.value.trim();

    if (!name) {
        output.textContent = 'Please enter your name!';
        output.classList.add('visible');
        return;
    }

    const newCount = appState.getState().greetCount + 1;

    appState.setState({
        greetCount: newCount,
        lastGreeted: name
    });

    // Save to storage
    storage.set('greetCount', newCount);
    storage.set('lastGreeted', name);

    // Update UI
    output.textContent = `Hello, ${name}! You've been greeted ${newCount} time${newCount !== 1 ? 's' : ''}.`;
    output.classList.add('visible');
});

// Enter key support
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        greetButton.click();
    }
});

// Subscribe to state changes for logging
appState.subscribe((state) => {
    console.log('App 01 State:', state);
});

// Load and display current app info
getCurrentAppInfo().then(appInfo => {
    if (appInfo) {
        console.log('Current App Info:', appInfo);
        // Could update page title dynamically
        document.title = `${appInfo.title} - MIT Lecture Apps`;
    }
});

console.log('Application 01 initialized');
console.log('Storage key prefix:', 'mit-app-app-01-');
