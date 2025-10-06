# Contributing Guide

## Creating a New Application

### Step 1: Copy Template

```bash
# Copy the app template to a new app directory
cp -r app-template apps/app-XX

# Where XX is the app number (02-21)
```

### Step 2: Update config.json

Add your app entry to `config.json`:

```json
{
  "id": "app-XX",
  "title": "Your App Title",
  "description": "Brief description of what your app does",
  "path": "apps/app-XX",
  "category": "utility",
  "icon": "🎯"
}
```

**Categories:**
- `utility` - General purpose utilities
- `tool` - Development or productivity tools
- `game` - Interactive games or puzzles
- `visualization` - Data visualizations or graphics
- `education` - Educational or learning apps

**Icon:** Choose an emoji that represents your app

### Step 3: Develop Your App

Edit the three main files in `apps/app-XX/`:

#### index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App XX - MIT Lecture Apps</title>
    <link rel="stylesheet" href="../../shared/css/app-template.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-container">
        <header class="app-header">
            <h1>Your App Title</h1>
            <a href="../../index.html" class="back-button">← Back to Home</a>
        </header>

        <main class="app-content">
            <!-- Your app content here -->
        </main>
    </div>

    <script src="../../shared/js/app-utils.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

#### styles.css
```css
/* Your custom styles */
```

#### app.js
```javascript
// Initialize state and storage
const appState = new AppState({ /* initial state */ });
const storage = new AppStorage('app-XX');

// Your app logic
```

### Step 4: Test Locally

```bash
# Start local server
python -m http.server 8000

# Or with Node.js
npx http-server
```

Test your app at:
- Landing page: `http://localhost:8000/`
- Your app: `http://localhost:8000/apps/app-XX/`

### Step 5: Commit and Deploy

```bash
git add .
git commit -m "Add app-XX: Your App Title"
git push origin main
```

GitHub Actions will automatically deploy to GitHub Pages.

## Development Guidelines

### File Structure
Each app must contain:
- `index.html` - Main HTML file
- `styles.css` - App-specific styles
- `app.js` - App logic

Optional files:
- Additional CSS files
- Additional JS modules
- Images in an `assets/` subdirectory
- Data files (JSON, CSV, etc.)

### Using Shared Resources

**Shared Utilities:**
```javascript
// Available functions from app-utils.js
navigateToHome();
getBasePath();
getCurrentAppInfo();
loadAppConfig();
new AppState(initialState);
new AppStorage(appId);
```

**Shared Styles:**
```css
/* Available in app-template.css */
.app-container
.app-header
.app-content
.back-button

/* CSS Variables */
var(--primary-color)
var(--secondary-color)
var(--background)
var(--text-color)
```

### Storage Namespacing

Each app automatically gets its own storage namespace:

```javascript
const storage = new AppStorage('app-XX');
storage.set('data', value);  // Saved as 'mit-app-app-XX-data'
```

This prevents conflicts between apps.

### State Management

Use the `AppState` class for reactive state:

```javascript
const appState = new AppState({
    count: 0,
    user: null
});

// Subscribe to changes
appState.subscribe((state) => {
    console.log('State updated:', state);
    updateUI(state);
});

// Update state
appState.setState({ count: appState.getState().count + 1 });
```

### Navigation

Always include the back button:

```html
<a href="../../index.html" class="back-button">← Back to Home</a>
```

Or use JavaScript:
```javascript
navigateToHome();
```

## Code Style

### HTML
- Use semantic HTML5 elements
- Include proper meta tags
- Keep markup clean and readable
- Use meaningful IDs and classes

### CSS
- Use CSS variables for theming
- Write mobile-first responsive styles
- Keep selectors simple and specific
- Comment complex styles

### JavaScript
- Use ES6+ features
- Write clear, self-documenting code
- Add comments for complex logic
- Handle errors gracefully
- Use `const` and `let`, avoid `var`

## Testing Checklist

Before committing:

- [ ] App loads without errors
- [ ] All functionality works as expected
- [ ] Responsive on mobile, tablet, desktop
- [ ] Back button navigates to home
- [ ] No console errors
- [ ] Storage works correctly
- [ ] config.json is valid JSON
- [ ] All file paths are correct

## Common Pitfalls

### Incorrect Paths
❌ Wrong: `href="/index.html"`
✅ Correct: `href="../../index.html"`

### Missing Resources
Make sure all linked files exist:
- CSS files
- JavaScript files
- Images
- Data files

### Invalid JSON
Validate config.json:
```bash
python -m json.tool config.json
```

### Storage Conflicts
Always use `AppStorage` with your app ID:
```javascript
const storage = new AppStorage('app-XX');  // Correct
```

## Getting Help

- Check `apps/app-01/` for a working example
- Review `shared/js/app-utils.js` for available utilities
- Test in local development environment first
- Check browser console for errors

## Deployment Notes

- Deployment is automatic on push to `main`
- Takes 1-2 minutes to propagate
- Check GitHub Actions tab for status
- URL format: `https://yourusername.github.io/mit-lecture-1/apps/app-XX/`

## Best Practices

1. **Keep it simple** - Focus on one clear purpose
2. **Be independent** - Don't rely on other apps
3. **Use shared utilities** - Don't reinvent the wheel
4. **Test thoroughly** - Check all features work
5. **Document** - Add comments for complex code
6. **Be responsive** - Support all screen sizes
7. **Handle errors** - Gracefully handle failures
8. **Save state** - Use storage for persistence

---

Happy coding! 🚀
