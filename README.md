# GFS Visual Learning System

An interactive visual learning system for understanding the Google File System architecture through diagrams, drills, and step-through animations.

## Features

- **13 Interactive Diagrams**: From basic concepts to advanced architecture
- **Overlay System**: Toggle different views to understand complex interactions
- **Step-Through Mode**: Animate through operations step by step
- **Interactive Drills**: Test your understanding with recall, apply, analyze, and create exercises
- **Progress Tracking**: Monitor your learning journey with persistent progress tracking
- **Export Capabilities**: Export diagrams as SVG, PNG, or Mermaid code

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gfs-visual-learning.git
cd gfs-visual-learning
```

2. Serve the application locally:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx http-server
```

3. Open your browser to `http://localhost:8000/docs`

### GitHub Pages Deployment

The application automatically deploys to GitHub Pages when you push to the main branch.

## Project Structure

```
gfs-visual-learning/
├── docs/                   # GitHub Pages deployment
│   ├── index.html         # Main application
│   ├── style.css          # Styling
│   ├── app.js             # Bundled JavaScript
│   └── data/              # Runtime data
├── src/                    # Source code
│   ├── core/              # Core engines
│   ├── learning/          # Learning system
│   └── ui/                # UI components
├── data/                   # Data specifications
│   ├── specs/             # Diagram JSON specs
│   ├── schema.json        # JSON Schema
│   └── manifest.json      # Diagram manifest
└── .github/workflows/      # CI/CD pipeline
```

## Creating New Diagrams

1. Create a JSON specification in `data/specs/`
2. Follow the schema defined in `data/schema.json`
3. Add the diagram to `data/manifest.json`
4. Run validation: `node scripts/validate-all.js`

## Keyboard Shortcuts

- **1-9**: Toggle overlays
- **←/→**: Step navigation
- **Ctrl+←/→**: Diagram navigation
- **Space**: Play/Pause steps
- **L**: Go to Legend
- **T**: Toggle theme
- **E**: Export diagram
- **?**: Show help

## Learning Paths

### Quick Start (30 minutes)
- Master Legend & System Contracts
- Complete Architecture
- Read Path with Cache

### Fundamentals (2 hours)
- All basic concepts and trade-offs
- Understanding scale and chunk sizes
- System architecture

### Operations Deep Dive (3 hours)
- Control vs Data plane separation
- Read and Write operations
- Lease mechanisms
- Consistency models

### Reliability & Evolution (2 hours)
- Failure recovery mechanisms
- System evolution timeline
- GFS influence on modern systems

## Development

### Adding New Features

1. **New Overlay Type**: Modify `src/ui/overlays.js`
2. **New Drill Type**: Update `src/learning/drills.js`
3. **New Diagram Layout**: Extend `src/core/renderer.js`

### Running Tests

```bash
npm test
```

### Building for Production

The build process is automated via GitHub Actions. On push to main:
1. Validates all JSON specs
2. Bundles JavaScript files
3. Deploys to GitHub Pages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all specs validate
5. Submit a pull request

## Based On

"The Google File System" by Sanjay Ghemawat, Howard Gobioff, and Shun-Tak Leung (SOSP 2003)

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Google File System paper authors
- MIT distributed systems course materials
- Open source visualization libraries (Mermaid.js)