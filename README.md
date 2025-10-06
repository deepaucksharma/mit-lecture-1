# MIT Lecture Apps Collection

A collection of 21 independent web applications hosted on GitHub Pages with a unified landing page.

## 🏗️ Architecture

```
/
├── index.html              # Main landing page
├── config.json             # App metadata and navigation
├── shared/                 # Shared resources
│   ├── css/
│   │   ├── main.css       # Landing page styles
│   │   └── app-template.css  # Reusable app styles
│   └── js/
│       ├── main.js        # Landing page logic
│       └── app-utils.js   # Shared utilities for apps
├── apps/                   # Individual applications
│   ├── app-01/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   ├── app-02/
│   └── ... (app-21)
├── app-template/           # Template for new apps
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages deployment
```

## 🚀 Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mit-lecture-1.git
cd mit-lecture-1
```

2. Serve locally using Python:
```bash
python -m http.server 8000
```

Or using Node.js:
```bash
npx http-server
```

3. Open `http://localhost:8000` in your browser

### Creating a New App

1. Copy the template:
```bash
cp -r app-template apps/app-XX
```

2. Update `config.json` with your app's metadata:
```json
{
  "id": "app-XX",
  "title": "Your App Title",
  "description": "Your app description",
  "path": "apps/app-XX",
  "category": "utility|tool|game|visualization|education",
  "icon": "🚀"
}
```

3. Customize your app:
   - Edit `apps/app-XX/index.html` - Main HTML structure
   - Edit `apps/app-XX/styles.css` - App-specific styles
   - Edit `apps/app-XX/app.js` - App logic

## 📦 Shared Utilities

Apps can use shared utilities from `shared/js/app-utils.js`:

### Navigation
```javascript
// Navigate back to home
navigateToHome();

// Get base path
const path = getBasePath();
```

### App Info
```javascript
// Get current app configuration
const appInfo = await getCurrentAppInfo();
console.log(appInfo.title, appInfo.description);

// Load all app config
const config = await loadAppConfig();
```

### State Management
```javascript
// Create app state
const appState = new AppState({ counter: 0 });

// Get state
const state = appState.getState();

// Update state
appState.setState({ counter: 1 });

// Subscribe to changes
appState.subscribe((state) => {
  console.log('State changed:', state);
});
```

### Local Storage
```javascript
// Initialize storage for your app
const storage = new AppStorage('app-XX');

// Save data
storage.set('key', { data: 'value' });

// Load data
const data = storage.get('key', defaultValue);

// Remove data
storage.remove('key');

// Clear all app data
storage.clear();
```

## 🎨 Styling

Each app can:
- Use shared template styles: `<link rel="stylesheet" href="../../shared/css/app-template.css">`
- Add custom styles in their own `styles.css`
- Override CSS variables:

```css
:root {
    --primary-color: #a31f34;
    --secondary-color: #8a8b8c;
    --background: #ffffff;
    --text-color: #212121;
}
```

## 🌐 GitHub Pages Deployment

### Setup

1. Go to your repository settings
2. Navigate to **Pages** section
3. Under **Source**, select **GitHub Actions**
4. Push to `main` branch to trigger automatic deployment

### Deployment Workflow

The `.github/workflows/deploy.yml` workflow automatically:
- Triggers on push to `main` branch
- Deploys all files to GitHub Pages
- Makes site available at `https://yourusername.github.io/mit-lecture-1/`

### URL Structure

- Landing page: `https://yourusername.github.io/mit-lecture-1/`
- Individual apps: `https://yourusername.github.io/mit-lecture-1/apps/app-01/`

## 📝 App Categories

Apps are organized by category:
- **utility** - General utilities
- **tool** - Development tools
- **game** - Interactive games
- **visualization** - Data visualizations
- **education** - Educational apps

## 🔧 Development Best Practices

1. **Keep apps independent** - Each app should be self-contained
2. **Use shared utilities** - Leverage `app-utils.js` for common functionality
3. **Namespace storage** - Each app has its own storage namespace automatically
4. **Test locally** - Always test before pushing to main
5. **Update config.json** - Keep app metadata current
6. **Mobile-friendly** - All apps should be responsive

## 📱 Mobile Support

The landing page and app template are fully responsive:
- Desktop: Grid layout with multiple columns
- Tablet: Adaptive grid
- Mobile: Single column layout

## 🐛 Troubleshooting

### Apps not loading
- Check browser console for errors
- Verify `config.json` is valid JSON
- Ensure all file paths are correct

### Styles not applying
- Check CSS file paths (relative to HTML)
- Verify CSS link tags in HTML
- Clear browser cache

### GitHub Pages not updating
- Check Actions tab for deployment status
- Verify repository Pages settings
- May take 1-2 minutes to propagate

## 📚 Example App Structure

See `apps/app-01/` for a complete working example demonstrating:
- State management
- Local storage
- Shared utilities
- Custom styling
- User interaction

## 🤝 Contributing

1. Create new app from template
2. Test locally
3. Update config.json
4. Commit and push to main
5. Verify deployment on GitHub Pages

## 📄 License

MIT License - feel free to use for your own projects.

## 🔗 Links

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

Built for MIT Lecture demonstrations
