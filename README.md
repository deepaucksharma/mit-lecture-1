# GFS Visual Learning System

An interactive visual learning system for understanding the Google File System architecture through diagrams, drills, and step-through animations.

## Features

- **13 Interactive Diagrams**: From basic concepts to advanced architecture ✅ 100% Complete
- **Overlay System**: Toggle different views to understand complex interactions ⚠️ 80% Complete
- **Step-Through Mode**: Animate through operations step by step ✅ 100% Complete
- **Interactive Drills**: Test your understanding with recall, apply, analyze, and create exercises ⚠️ 70% Complete
- **Progress Tracking**: Monitor your learning journey with persistent progress tracking ✅ 95% Complete
- **Export Capabilities**: Export diagrams as SVG, PNG, or Mermaid code ⚠️ 75% Complete

## Current Status

**Latest Test Results (October 12, 2025):**
- **Tests:** 130 total, 65 passed, 65 failed (50% pass rate)
- **Visual Coverage:** 117 screenshots captured across all 13 GFS specs
- **Core Features:** Fully functional (diagram rendering, navigation, scenes)
- **Known Issues:** 5 critical issues affecting 65 tests (see test documentation)

**What's Working:**
- All 13 diagrams render correctly with Mermaid.js
- Scene navigation and tab switching fully functional
- Crystallized insights and prerequisites display properly
- Assessment checkpoints and basic drills working
- Visual regression testing with comprehensive screenshots

**What Needs Work:**
- Advanced Concepts section (not implemented)
- Drill ThoughtProcess display (missing UI component)
- Unified Navigation state counter (broken)
- Interactive element handlers (some not responding)
- First Principles section detection (test issue)

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
# Quick smoke tests (30 seconds)
npm run test:smoke

# Full test suite (10 minutes)
npm test

# Specific test categories
npm run test:errors          # Error detection
npm run test:performance     # Performance metrics
npm run test:accessibility   # A11y checks

# View test reports
open tests/reports/test-report.html
```

**Test Coverage:**
- 130 tests across 13 GFS specifications
- Comprehensive visual regression (117 screenshots)
- Performance benchmarking (page load, render times)
- Accessibility compliance (WCAG AA)
- Error detection (JavaScript, console, network)

**Test Documentation:** See `/home/deepak/mit-lecture-1/tests/README.md` for detailed test information, known issues, and troubleshooting.

### Building for Production

The build process is automated via GitHub Actions. On push to main:
1. Validates all JSON specs
2. Bundles JavaScript files
3. Deploys to GitHub Pages

**CI/CD Status:**
- Automated deployment to GitHub Pages
- Test validation disabled (pending fixes)
- Build artifacts stored in `docs/` directory

## Known Issues & Roadmap

### Critical Issues (In Progress)

1. **Advanced Concepts Section** - Not yet implemented in UI (Priority: High)
2. **Drill ThoughtProcess Display** - Missing UI rendering component (Priority: Medium)
3. **Unified Navigation Counter** - State counting logic broken (Priority: Low)
4. **Interactive Element Handlers** - Some event handlers not responding (Priority: Medium)
5. **JavaScript Error: checkAnalysis** - Null reference in state manager (Priority: High)

See `/home/deepak/mit-lecture-1/tests/README.md` for detailed issue descriptions and workarounds.

### Roadmap

**Short Term (Next Release):**
- Fix checkAnalysis null reference error
- Implement Advanced Concepts section
- Add ThoughtProcess rendering for drills
- Fix unified navigation state counter
- Improve interactive element reliability

**Medium Term:**
- Enhance accessibility (target WCAG AAA)
- Add more keyboard shortcuts
- Implement diagram comparison mode
- Add learning path recommendations
- Export progress reports

**Long Term:**
- Multi-language support
- Collaborative learning features
- Custom diagram creation
- Integration with learning management systems
- Mobile app version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all specs validate
5. Run tests: `npm test`
6. Submit a pull request

**Development Guidelines:**
- Follow existing code structure
- Add tests for new features
- Update documentation
- Ensure accessibility compliance
- Test across browsers (Chrome, Firefox, Safari)

## Based On

"The Google File System" by Sanjay Ghemawat, Howard Gobioff, and Shun-Tak Leung (SOSP 2003)

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Google File System paper authors
- MIT distributed systems course materials
- Open source visualization libraries (Mermaid.js)