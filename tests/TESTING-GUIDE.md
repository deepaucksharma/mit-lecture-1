# GFS Visual Learning System - Browser Testing Guide

## Server Information
- **URL**: http://localhost:8000 or http://localhost:8080
- **Status**: Server is running (check with `ps aux | grep "python3 -m http.server"`)

## Complete Testing Checklist

### Test Each Spec (00-12) with the Following Steps:

#### For Spec 00 - Master Legend & System Contracts:

1. **Load the Spec**
   - Click "00 - Master Legend & System Contracts" in left sidebar
   - Expected: Title updates in header

2. **Verify Crystallized Insight**
   - Look for 💎 diamond panel above the narrative
   - Expected: "The separation of control and data is the foundation of all scalable systems—it's Amdahl's Law applied to distributed architecture"
   - Location: Top of main content area

3. **Verify Prerequisites Panel**
   - Should be below the crystallized insight
   - For spec 00: May be hidden (no prerequisites)
   - For specs 01+: Should show prerequisite concepts

4. **Verify Narrative Panel**
   - Check the 📖 Narrative section
   - Expected: Extended narrative explaining the concept

5. **Verify Contracts Panel** (Left middle sidebar)
   - Check 📋 Contracts section shows:
     - 🔒 System Invariants
     - ✓ Guarantees
     - ⚠️ Caveats

6. **Verify Scenes Work**
   - Look at timeline at bottom of diagram
   - Expected: 3 markers for 3 scenes
   - Click each scene marker or use ◀/▶ buttons
   - Expected scenes for 00-legend:
     - Scene 1: Base System Components
     - Scene 2: The Sacred Separation Principle
     - Scene 3: What Happens When Rules Are Broken

7. **Verify Right Sidebar Tabs**
   - **Drills Tab** (should be active by default):
     - Check if drills are listed
     - Expected: 3 drills for spec 00
     - Click to expand a drill

   - **Principles Tab** (click to switch):
     - Expected: "🔬 First Principles" section
     - Should show theoretical foundations
     - Should show "🚀 Advanced Concepts" below
     - Check for subsections like:
       - Theoretical Foundation
       - Quantitative Analysis
       - Alternative Architectures

   - **Assessment Tab** (click to switch):
     - Expected: "✅ Assessment Checkpoints"
     - Should show checkpoint cards:
       - "I understand why control and data must be separate"
       - "I can identify what must NEVER change in GFS"
       - "I see what GFS sacrificed and what it gained"

#### Repeat for All Specs 01-12:

| Spec | Expected Scenes | Expected Overlays | Key Insight Topic |
|------|----------------|-------------------|-------------------|
| 01-triangle | 4 | 3 | CAP theorem trade-offs |
| 02-scale | 4 | 3 | Failure as normal state |
| 03-chunk-size | 4 | 3 | 64MB Goldilocks zone |
| 04-architecture | 4 | 3 | Control/data separation |
| 05-planes | 4 | 3 | Fast vs smart separation |
| 06-read-path | 3 | 2 | Cache for load reduction |
| 07-write-path | 3 | 3 | Parallel data, serial commit |
| 08-lease | 3 | 4 | Authority must expire |
| 09-consistency | 3 | 3 | Strategic imperfection |
| 10-recovery | 3 | 3 | Design for failure |
| 11-evolution | 3 | 3 | Every design has expiration date |
| 12-dna | 4 | 4 | Ideas outlive implementations |

## Common Issues to Check:

### If Nothing Shows:
- Open browser console (F12)
- Check for JavaScript errors
- Verify fetch requests succeed (Network tab)

### If Crystallized Insight Doesn't Show:
- Check if `.insight-panel` has `display: none` or `display: flex`
- Verify `renderCrystallizedInsight()` is being called

### If Tabs Don't Switch:
- Click the tab buttons at top of right sidebar
- Check console for JavaScript errors
- Verify event listeners attached

### If First Principles/Assessment Don't Show:
- Switch to respective tabs first
- Check if content is being populated
- Verify the spec has the data (check test results above)

## Quick Console Tests:

Open browser console and run:

```javascript
// Check if viewer exists
console.log('Viewer exists:', !!window.viewer);

// Check current spec
console.log('Current spec:', window.viewer?.currentSpec?.id);

// Check if functions exist
console.log('Has renderCrystallizedInsight:', !!window.viewer?.renderCrystallizedInsight);
console.log('Has renderFirstPrinciples:', !!window.viewer?.renderFirstPrinciples);

// Check if elements exist
console.log('Crystallized insight element:', document.getElementById('crystallized-insight'));
console.log('Principles container:', document.getElementById('principles-container'));
console.log('Assessment container:', document.getElementById('assessment-container'));

// Force render
window.viewer.renderCrystallizedInsight(window.viewer.currentSpec);
window.viewer.renderFirstPrinciples(window.viewer.currentSpec);
window.viewer.renderAssessmentCheckpoints(window.viewer.currentSpec);
```

## Manual Testing Workflow:

1. Open http://localhost:8000 in browser
2. Open Developer Tools (F12)
3. Go to Console tab - check for errors
4. Test Spec 00-legend first (most complete)
5. Take screenshot of each tab view
6. Navigate through all scenes
7. Repeat for remaining 12 specs

## Expected Final State:

✅ All 13 specs load without errors
✅ Crystallized insight shows for all specs
✅ Prerequisites show for specs with them
✅ Scenes navigate properly
✅ All 3 tabs work (Drills, Principles, Assessment)
✅ First principles display with proper formatting
✅ Advanced concepts show in Principles tab
✅ Assessment checkpoints display in Assessment tab

