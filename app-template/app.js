// App-specific JavaScript
// This is a template - replace with your app's logic

// Initialize app state
const appState = new AppState({
    clickCount: 0
});

// Initialize storage
const storage = new AppStorage('template');

// Load saved state
const savedCount = storage.get('clickCount', 0);
appState.setState({ clickCount: savedCount });

// Example button interaction
document.getElementById('exampleButton').addEventListener('click', () => {
    const currentCount = appState.getState().clickCount + 1;
    appState.setState({ clickCount: currentCount });

    // Save to storage
    storage.set('clickCount', currentCount);

    // Update UI
    const output = document.getElementById('output');
    output.textContent = `Button clicked ${currentCount} time${currentCount !== 1 ? 's' : ''}!`;
    output.classList.add('visible');
});

// Subscribe to state changes
appState.subscribe((state) => {
    console.log('State updated:', state);
});

// Load current app info
getCurrentAppInfo().then(appInfo => {
    if (appInfo) {
        console.log('Current app:', appInfo);
        document.title = `${appInfo.title} - MIT Lecture Apps`;
    }
});
