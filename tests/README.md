# GFS Visual Learning System - Test Suite

## 📋 Overview

Comprehensive end-to-end testing framework that simulates real user interactions and verifies all features of the enhanced GFS Visual Learning System.

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:comprehensive    # Main E2E test suite
npm run test:enhanced         # Enhanced features test
npm run test:verify          # Quick verification

# View reports
npm run test:report          # Open HTML report
npm run test:screenshots     # View screenshot gallery
```

## 📁 Test Structure

```
tests/
├── test-suite.js            # Main comprehensive E2E test suite
├── test-enhanced-features.js # Tests for new spec enhancements
├── verify-enhancements.js   # Quick verification script
├── TEST-SUMMARY.md          # Detailed test documentation
├── TESTING-GUIDE.md         # Testing guidelines
├── screenshots/             # Test screenshots
│   ├── comprehensive/       # E2E test screenshots
│   └── enhanced/           # Enhanced feature screenshots
└── reports/                # Generated test reports
    ├── test-report.html    # Visual HTML report
    ├── test-report.md      # Markdown report
    └── test-results.json   # JSON data
```

## 🧪 Test Coverage

### Main Test Suite (`test-suite.js`)
Tests all 13 GFS specifications with:
- **9 test categories per spec**
- **100+ screenshots captured**
- **Real user interactions** (clicking, typing, navigating)

#### Tests Per Specification:
1. **Diagram Rendering** - Verifies SVG/Mermaid diagrams load
2. **Crystallized Insights** - Checks insight panel content
3. **Prerequisites** - Validates prerequisite concepts
4. **First Principles** - Tests theoretical foundations tab
5. **Advanced Concepts** - Verifies alternative approaches
6. **Assessment Checkpoints** - Tests progress tracking
7. **Drills with ThoughtProcess** - Interactive drill testing
8. **Scene Navigation** - State management verification
9. **Interactive Elements** - UI responsiveness

### Enhanced Features Test
Specifically tests:
- ThoughtProcess arrays in drills
- Insight fields with gradient styling
- First Principles sections
- Advanced Concepts content
- Prerequisites panel
- Assessment checkpoints

### Verification Script
Quick checks for:
- Spec file structure
- JavaScript methods
- CSS styles
- Data synchronization

## 📸 Screenshots

The test suite captures extensive screenshots:

- **Per Specification**: ~8 screenshots
- **Total Coverage**: 100+ images per full run
- **Interaction States**: Before/after user actions
- **Multiple Tabs**: Drills, Principles, Assessment
- **Scene States**: Different diagram states

## 📊 Reports

Three report formats generated:

### HTML Report
- Visual dashboard with statistics
- Color-coded pass/fail indicators
- Screenshot references
- Error tracking

### Markdown Report
- Detailed text-based results
- Test-by-test breakdown
- Error descriptions

### JSON Report
- Machine-readable data
- Complete test details
- Timing information

## 🔧 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure specs are synchronized
cp data/specs/*.json docs/data/specs/
```

### Test Execution
```bash
# Start test server (if not running)
npm run start:test

# Run comprehensive test suite
npm run test:comprehensive

# Verify all enhancements
npm run test:verify
```

### Test Configuration
Edit test configuration in `test-suite.js`:
```javascript
const CONFIG = {
  baseUrl: 'http://localhost:8888',
  viewport: { width: 1920, height: 1080 },
  headless: 'new',  // Set to false for debugging
  slowMo: 50,       // Milliseconds between actions
};
```

## 🎯 What Gets Tested

### User Interactions
- Navigation between all 13 specs
- Tab switching (Drills → Principles → Assessment)
- Drill expansion and interaction
- Answer submission and feedback
- Scene/state navigation
- Overlay toggling

### Content Verification
- First Principles theoretical foundations
- Advanced Concepts alternatives
- ThoughtProcess step-by-step arrays
- Insight messages with styling
- Prerequisites concepts
- Assessment checkpoints
- Diagram rendering
- Interactive elements

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8888
lsof -ti:8888 | xargs kill -9
```

### Tests Timing Out
- Increase timeout in CONFIG
- Check server is running
- Verify network connectivity

### Missing Screenshots
- Ensure directories exist
- Check write permissions
- Verify Puppeteer installation

## 📝 Adding New Tests

To add new test cases:

1. Add test method to `GFSTestSuite` class
2. Call method from `testSpec()`
3. Update report generation
4. Add screenshot captures

Example:
```javascript
async testNewFeature(specId, results) {
  console.log('Testing new feature...');
  const test = { name: 'New Feature', passed: false };

  // Your test logic here

  results.tests.push(test);
}
```

## 🔄 Continuous Integration

The test suite is designed for CI/CD:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    npm ci
    npm run build
    npm test
```

## 📈 Success Criteria

Tests pass when:
- All diagrams render correctly
- All tabs are accessible
- Drills show thoughtProcess arrays
- Insights display with styling
- Navigation works smoothly
- No JavaScript errors
- Screenshots captured successfully

## 🤝 Contributing

When modifying tests:
1. Update test cases
2. Regenerate screenshots
3. Update documentation
4. Verify all tests pass

## 📚 Resources

- [TEST-SUMMARY.md](TEST-SUMMARY.md) - Detailed documentation
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Testing best practices
- [Puppeteer Docs](https://pptr.dev/) - Browser automation
- [GFS Paper](https://research.google/pubs/pub51/) - Original specification