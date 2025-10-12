# GFS Visual Learning System - Test Suite

## 📋 Overview

Comprehensive test suite for the GFS Visual Learning System with enhanced coverage including performance, accessibility, error detection, and visual validation. The suite has been reorganized and consolidated for better maintainability and coverage.

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:smoke           # Quick smoke tests (30s)
npm run test:errors          # Error detection
npm run test:performance     # Performance metrics
npm run test:accessibility   # Accessibility checks
npm run test:e2e             # Full E2E suite

# Run CI-friendly tests (fast)
npm run test:ci              # Validation + Smoke + Errors (~2 min)

# View reports
open tests/reports/master-test-report.html
```

## 📁 Test Structure

```
tests/
├── README.md                      # This file
├── run-all-tests.js              # Master test runner
│
├── Core Tests/
│   ├── test-errors.js            # Consolidated error detection
│   ├── test-performance.js       # Performance metrics (NEW)
│   ├── test-accessibility.js     # WCAG compliance (NEW)
│   └── test-quick-smoke.js       # Fast smoke tests
│
├── Validation Tests/
│   ├── verify-enhancements.js    # Static validation
│   └── test-diagram-validation.js # Mermaid validation
│
├── Integration Tests/
│   ├── test-enhanced-features.js # Feature testing
│   ├── test-in-depth-visual.js   # Visual regression
│   └── test-suite.js             # Comprehensive E2E
│
├── archived/                     # Deprecated tests
│   ├── test-js-errors.js        # Merged into test-errors.js
│   ├── test-app-errors.js       # Merged into test-errors.js
│   ├── test-comprehensive-e2e.js # Duplicate of test-suite.js
│   └── test-unified-nav.js      # Merged into test-quick-smoke.js
│
├── reports/                      # Test outputs
│   ├── master-test-report.json  # Overall summary
│   ├── master-test-report.md    # Markdown report
│   ├── performance-report.json  # Performance metrics
│   ├── accessibility-report.json # A11y issues
│   └── error-test-report.json   # JS errors
│
└── screenshots/                  # Visual captures
    ├── comprehensive/            # E2E screenshots
    ├── enhanced/                # Feature screenshots
    └── visual/                  # Visual regression
```

## 🧪 Test Categories

### 1. **Static Validation** (`verify-enhancements.js`)
- ✅ No browser required
- ✅ Validates JSON spec structure
- ✅ Checks code implementation
- ✅ Verifies data synchronization
- **Runtime:** ~5 seconds

### 2. **Quick Smoke Tests** (`test-quick-smoke.js`)
- ✅ Fast sanity checks
- ✅ Navigation functionality
- ✅ Basic rendering
- ✅ CI/CD optimized
- **Runtime:** ~30 seconds

### 3. **Error Detection** (`test-errors.js`)
- ✅ JavaScript error monitoring
- ✅ Console warnings
- ✅ Network failures
- ✅ Component initialization
- **Runtime:** ~1 minute

### 4. **Performance Tests** (`test-performance.js`) 🆕
- ✅ Page load times (<3s threshold)
- ✅ Diagram rendering speed (<2s)
- ✅ Navigation responsiveness (<500ms)
- ✅ Memory usage monitoring (<100MB)
- ✅ Resource optimization
- **Runtime:** ~2 minutes

### 5. **Accessibility Tests** (`test-accessibility.js`) 🆕
- ✅ Keyboard navigation
- ✅ ARIA labels and roles
- ✅ Color contrast (WCAG AA)
- ✅ Heading structure
- ✅ Responsive design (mobile/tablet/desktop)
- **Runtime:** ~2 minutes

### 6. **Diagram Validation** (`test-diagram-validation.js`)
- ✅ Mermaid syntax validation
- ✅ SVG element counting
- ✅ Diagram-specific rules
- ✅ Container dimensions
- **Runtime:** ~1 minute

### 7. **Integration Tests**
- **Enhanced Features** (`test-enhanced-features.js`)
  - Feature interactions
  - Tab switching
  - State management
  - **Runtime:** ~3 minutes

- **Visual Tests** (`test-in-depth-visual.js`)
  - Visual regression
  - Screenshot per state
  - All tabs coverage
  - **Runtime:** ~5 minutes

### 8. **Comprehensive E2E** (`test-suite.js`)
- ✅ Full user journeys
- ✅ All 13 diagrams
- ✅ 10 tests per diagram
- ✅ 100+ screenshots
- **Runtime:** ~10 minutes

## 📊 Test Coverage & Metrics

### Latest Test Results (October 12, 2025)

**Overall Summary:**
- **Total Tests:** 130
- **Passed:** 65 ✅
- **Failed:** 65 ❌
- **Pass Rate:** 50.0%
- **Errors Detected:** 13 JavaScript errors
- **Screenshots Captured:** 117 across all specs
- **GFS Specs Tested:** All 13 specs (00-legend through 12-dna)

### Current Coverage
| Area | Coverage | Goal | Status |
|------|----------|------|--------|
| **Functional** | 50% | 95% | 🔴 Needs Improvement |
| **Visual** | 90% | 80% | 🟢 Excellent |
| **Performance** | 70% | 85% | 🟡 Good |
| **Accessibility** | 50% | 80% | 🟠 Needs Work |
| **Error Handling** | 90% | 95% | 🟢 Excellent |

### Test Results by Category
| Test Category | Passed | Failed | Notes |
|--------------|--------|--------|-------|
| Diagram Rendering | 13/13 | 0 | ✅ All diagrams render correctly |
| Crystallized Insight | 13/13 | 0 | ✅ All insights display properly |
| Prerequisites | 13/13 | 0 | ✅ Prerequisites work across all specs |
| First Principles | 0/13 | 13 | ❌ Section detection issues |
| Advanced Concepts | 0/13 | 13 | ❌ Missing implementation |
| Assessment Checkpoints | 13/13 | 0 | ✅ All checkpoints functioning |
| Drills with ThoughtProcess | 0/13 | 13 | ❌ ThoughtProcess not fully implemented |
| Scene Navigation | 13/13 | 0 | ✅ Scene transitions working |
| Unified Navigation | 0/13 | 13 | ❌ Total states reporting incorrectly |
| Interactive Elements | 0/13 | 13 | ❌ Interactive features need work |

### Performance Thresholds
| Metric | Threshold | Current | Status |
|--------|-----------|---------|--------|
| Page Load | 3000ms | ~2500ms | ✅ Pass |
| Diagram Render | 2000ms | ~1800ms | ✅ Pass |
| State Navigation | 500ms | ~300ms | ✅ Pass |
| Memory Usage | 100MB | ~75MB | ✅ Pass |
| CPU Usage | 50% | ~35% | ✅ Pass |

## 🎯 Running Tests

### Master Test Runner
```bash
# Run all tests with detailed reporting
node tests/run-all-tests.js

# Run specific category
node tests/run-all-tests.js --category performance
node tests/run-all-tests.js --category accessibility
node tests/run-all-tests.js --category smoke

# Run specific test by name
node tests/run-all-tests.js --test navigation
node tests/run-all-tests.js --test "error detection"

# Show help
node tests/run-all-tests.js --help
```

### NPM Scripts
```json
{
  "scripts": {
    "test": "node tests/run-all-tests.js",
    "test:smoke": "node tests/test-quick-smoke.js",
    "test:errors": "node tests/test-errors.js",
    "test:performance": "node tests/test-performance.js",
    "test:accessibility": "node tests/test-accessibility.js",
    "test:validate": "node tests/verify-enhancements.js",
    "test:e2e": "node tests/test-suite.js",
    "test:visual": "node tests/test-in-depth-visual.js",
    "test:ci": "npm run test:validate && npm run test:smoke && npm run test:errors",
    "test:full": "npm test",
    "test:report": "open tests/reports/master-test-report.html"
  }
}
```

### CI/CD Integration

#### Quick CI Pipeline (~2 minutes)
```yaml
name: Quick Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm start &
      - run: sleep 5
      - run: npm run test:ci
```

#### Full Test Pipeline (~20 minutes)
```yaml
name: Full Test Suite
on:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm start &
      - run: sleep 5
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: tests/reports/
```

## 📈 Reports

### Master Test Report
- **Location:** `tests/reports/master-test-report.json`
- **Format:** JSON + Markdown
- **Contents:**
  - Overall pass/fail status
  - Test duration metrics
  - Category breakdown
  - Failed test details

### Performance Report
- **Location:** `tests/reports/performance-report.json`
- **Metrics:**
  - Page load times
  - Rendering performance
  - Memory usage
  - Resource loading

### Accessibility Report
- **Location:** `tests/reports/accessibility-report.json`
- **Issues by severity:**
  - Critical (must fix)
  - Serious (should fix)
  - Moderate (consider fixing)
  - Minor (nice to have)

### Error Report
- **Location:** `tests/reports/error-test-report.json`
- **Tracked errors:**
  - JavaScript exceptions
  - Console errors
  - Network failures
  - Component failures

## 🐛 Known Issues

### Critical Issues (Blocking 50% of Tests)

#### 1. JavaScript Error: checkAnalysis is null
**Affected Tests:** All 13 specs
**Error Message:** `Cannot read properties of null (reading 'checkAnalysis')`
**Impact:** Causes interactive element tests to fail
**Status:** 🔴 Open
**Priority:** High

**Cause:** The state manager's `checkAnalysis` property is not being initialized properly when drills are loaded.

**Workaround:**
```javascript
// In state-manager.js, ensure checkAnalysis is initialized
if (!this.checkAnalysis) {
  this.checkAnalysis = {};
}
```

**Related Files:**
- `/home/deepak/mit-lecture-1/docs/state-manager.js`
- `/home/deepak/mit-lecture-1/docs/app.js`

#### 2. Advanced Concepts Section Missing
**Affected Tests:** All 13 specs (0/13 passing)
**Impact:** "Advanced Concepts" tab shows no content
**Status:** 🔴 Open
**Priority:** High

**Cause:** The Advanced Concepts section in the UI is not properly connected to the spec data or the data is missing from specs.

**Expected Behavior:**
- Should show alternatives to current design
- Should highlight modern implementations
- Should discuss open problems

**Related Files:**
- `/home/deepak/mit-lecture-1/data/specs/*.json`

#### 3. Drill ThoughtProcess Not Displaying
**Affected Tests:** All 13 specs (0/13 passing)
**Impact:** Drills lack detailed thinking process
**Status:** 🟡 In Progress
**Priority:** Medium

**Cause:** The `thoughtProcess` field in drill questions is not being rendered in the UI.

**Expected Behavior:**
- Each drill answer should show step-by-step reasoning
- Should help users understand the problem-solving approach

#### 4. Unified Navigation State Count Issue
**Affected Tests:** All 13 specs (0/13 passing)
**Impact:** Navigation state count reports 0
**Status:** 🟡 In Progress
**Priority:** Low

**Cause:** The unified navigation counter is not aggregating states from all tabs correctly.

**Expected Behavior:**
- Should count all scenes across diagram, overlay, and step-through modes
- Should display total navigable states

#### 5. Interactive Elements Not Fully Functional
**Affected Tests:** All 13 specs (0/13 passing)
**Impact:** Some interactive features don't respond to user input
**Status:** 🟡 In Progress
**Priority:** Medium

**Areas Affected:**
- Some overlay toggles
- Scene transitions in certain modes
- Export functionality in edge cases

### Feature Implementation Status

| Feature | Status | Implementation % | Notes |
|---------|--------|------------------|-------|
| **Core Features** |
| Diagram Rendering | ✅ Complete | 100% | All 13 diagrams render correctly |
| Mermaid Integration | ✅ Complete | 100% | SVG generation working |
| Multi-tab Interface | ✅ Complete | 100% | All tabs accessible |
| Scene Navigation | ✅ Complete | 100% | Forward/backward working |
| **Learning Features** |
| Crystallized Insights | ✅ Complete | 100% | All insights display |
| Prerequisites | ✅ Complete | 100% | Prerequisite checks working |
| First Principles | ⚠️ Partial | 60% | Content exists, section detection fails |
| Advanced Concepts | ❌ Missing | 0% | Not implemented in UI |
| Assessment Checkpoints | ✅ Complete | 100% | All checkpoints functional |
| Drills | ⚠️ Partial | 70% | Working but missing ThoughtProcess |
| **Interactive Features** |
| Overlay System | ⚠️ Partial | 80% | Most overlays work |
| Step-Through Mode | ✅ Complete | 100% | Animation working |
| Keyboard Shortcuts | ✅ Complete | 90% | Most shortcuts work |
| Progress Tracking | ✅ Complete | 95% | Saves progress locally |
| Export Capabilities | ⚠️ Partial | 75% | Basic export works |
| **Navigation** |
| Scene Transitions | ✅ Complete | 100% | All transitions smooth |
| Unified Navigation | ❌ Broken | 30% | State counting broken |
| Tab Switching | ✅ Complete | 100% | All tabs switch correctly |
| **Visual Features** |
| Screenshots | ✅ Complete | 100% | 117 screenshots captured |
| Responsive Design | ⚠️ Partial | 80% | Works on most devices |
| Theme Toggle | ✅ Complete | 100% | Dark/light mode working |

### Screenshots Location and Organization

All screenshots are stored in `/home/deepak/mit-lecture-1/tests/screenshots/comprehensive/`

**Naming Convention:**
```
{spec-id}-{scene-number}-{tab-name}.png
```

**Examples:**
- `00-legend-01-diagram.png` - Legend spec, scene 1, diagram tab
- `01-triangle-02-insight.png` - Triangle spec, scene 2, insight tab
- `12-dna-07-unified-nav.png` - DNA spec, unified navigation view

**Screenshot Coverage (117 total):**
- Per Spec: 9 screenshots each (13 specs × 9 = 117)
  - 01: Diagram rendering
  - 02: Crystallized insight
  - 03: First principles
  - 04: Assessment checkpoints
  - 05: Drills
  - 06: Unified navigation
  - Scene-2, Scene-3, Scene-4: Various navigation states

**Screenshot Types:**
| Type | Count | Purpose |
|------|-------|---------|
| Diagram Views | 13 | Verify diagram rendering |
| Insight Panels | 13 | Check insight display |
| First Principles | 13 | Validate content display |
| Assessment | 13 | Check checkpoint UI |
| Drills | 13 | Verify drill interface |
| Navigation States | 52 | Test scene transitions |
| Unified Nav | 13 | Check navigation UI |

**Use Cases:**
1. **Visual Regression Testing:** Compare screenshots between releases
2. **Documentation:** Embed in user guides and tutorials
3. **Bug Reports:** Attach relevant screenshots to issues
4. **Design Review:** Evaluate UI/UX consistency

## 🔧 Troubleshooting

### Common Test Failures

#### Test Fails: "Advanced Concepts: 0 chars"
**Symptom:** Advanced Concepts section shows no content

**Solution:**
1. Check if spec JSON has `advancedConcepts` field
2. Verify UI component is loading the data
3. Ensure tab is properly registered in app.js

```bash
# Check spec structure
grep -r "advancedConcepts" data/specs/
```

#### Test Fails: "Drills with ThoughtProcess"
**Symptom:** Drill thoughtProcess field not displaying

**Solution:**
1. Verify drill JSON has `thoughtProcess` field
2. Check drill renderer in app.js
3. Ensure CSS styles for thoughtProcess exist

```bash
# Verify thoughtProcess in specs
grep -A5 "thoughtProcess" data/specs/*.json
```

#### Test Fails: "Unified Navigation: 0 total states"
**Symptom:** Navigation counter shows 0

**Solution:**
1. Check state-manager.js state counting logic
2. Verify scenes are being registered
3. Test navigation counter update events

```javascript
// Debug state counting
console.log('Total states:', stateManager.getTotalStates());
```

#### JavaScript Error: checkAnalysis is null
**Symptom:** Console shows null property read error

**Solution:**
1. Initialize checkAnalysis in state-manager.js constructor
2. Add null checks before accessing property
3. Ensure drills are loaded before analysis

```javascript
// Add safety check
if (this.checkAnalysis) {
  this.checkAnalysis.method();
}
```

### Common Issues

#### Port Already in Use
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
PORT=8080 npm start
```

#### Puppeteer Installation Issues
```bash
# Reinstall with proper dependencies
npm uninstall puppeteer
npm install puppeteer --save-dev

# For M1 Macs
npm install puppeteer --save-dev --platform=darwin --arch=arm64
```

#### Tests Timing Out
```javascript
// Increase timeout in test file
page.setDefaultTimeout(60000); // 60 seconds

// Or in specific wait
await page.waitForSelector('#element', { timeout: 30000 });
```

#### Permission Errors
```bash
# Make test runner executable
chmod +x tests/run-all-tests.js

# Fix report directory permissions
chmod -R 755 tests/reports/
```

## 🎨 Adding New Tests

### Test Template
```javascript
class MyNewTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({ headless: 'new' });
    this.page = await this.browser.newPage();
    return this;
  }

  async testFeature() {
    // Test implementation
  }

  generateReport() {
    // Report generation
  }

  async cleanup() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.testFeature();
      const report = this.generateReport();
      return report.passed ? 0 : 1;
    } finally {
      await this.cleanup();
    }
  }
}

if (require.main === module) {
  const tester = new MyNewTestSuite();
  tester.run().then(process.exit);
}

module.exports = MyNewTestSuite;
```

### Integration Steps
1. Create test file in `tests/` directory
2. Follow naming: `test-{feature}.js`
3. Add to `run-all-tests.js` configuration
4. Update package.json scripts
5. Document in this README

## 📅 Maintenance Schedule

### Daily
- Monitor CI/CD test results
- Review error reports

### Weekly
- Review test failures
- Update performance thresholds
- Clean old screenshots

### Monthly
- Consolidate duplicate tests
- Update test documentation
- Review coverage metrics

### Quarterly
- Full accessibility audit
- Performance baseline update
- Test suite optimization

## 🚦 Success Criteria

Tests are considered passing when:

✅ **Functional**
- All diagrams render
- Navigation works
- Features accessible
- No JS errors

✅ **Performance**
- Page loads < 3s
- Diagrams render < 2s
- Navigation < 500ms
- Memory < 100MB

✅ **Accessibility**
- Keyboard navigable
- WCAG AA compliant
- Mobile responsive
- Proper ARIA labels

✅ **Visual**
- Screenshots match baseline
- No visual regressions
- Consistent styling

## 📚 Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Performance Metrics](https://web.dev/metrics/)
- [Testing Best Practices](./TESTING-GUIDE.md)
- [GFS Original Paper](https://research.google/pubs/pub51/)

## 🤝 Contributing

When modifying tests:
1. Run affected tests locally
2. Update test documentation
3. Regenerate reports/screenshots
4. Ensure all tests pass
5. Submit PR with test results

## 📞 Support

For test-related issues:
- Create GitHub issue with `testing` label
- Include test report in issue
- Specify test file and line number
- Attach relevant screenshots

---

**Last Updated:** October 2024
**Test Suite Version:** 2.0
**Maintained By:** Development Team