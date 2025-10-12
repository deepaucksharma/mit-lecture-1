# Complete Refactoring Plan for GFS Visual Learning System

## Current Issues Identified

### 1. Architecture Problems
- **Monolithic Bundle**: Single 4000-line app.js file
- **Duplicate Code**: StateManager and MermaidRenderer exist in multiple places
- **Inconsistent Module System**: Mix of ES6 classes and old patterns
- **Previous Refactoring Not Integrated**: modules/ directory exists but not used

### 2. Data Flow Issues
- **Circular Dependencies**: Viewer → Renderer → Composer → back to Viewer
- **Event Spaghetti**: Events dispatched and listened to across modules without clear flow
- **State Fragmentation**: Steps, overlays, scenes all managing state separately
- **No Clear Data Model**: Spec structure varies between diagrams

### 3. UI/UX Inconsistencies
- **Multiple Control Panels**: Steps, overlays, state controls all separate
- **Tab Switching Issues**: Principles/Practice tabs not syncing properly
- **Loading States**: Multiple loading indicators without coordination
- **Error Handling**: Inconsistent error display across modules

### 4. State Management Problems
- **No Single Source of Truth**: State scattered across classes
- **LocalStorage Chaos**: Multiple modules writing to localStorage independently
- **Progress Tracking**: Removed but references still exist
- **Sync Issues**: UI state not syncing with application state

## Proposed Solution

### Phase 1: Clean Architecture (Core)
```
src/
├── core/
│   ├── app.js              # Main application controller
│   ├── config.js           # Central configuration
│   ├── events.js           # Event bus system
│   └── types.js            # TypeScript-like type definitions
├── data/
│   ├── spec-loader.js      # Loads and validates specs
│   ├── spec-model.js       # Spec data model
│   └── storage.js          # LocalStorage abstraction
├── render/
│   ├── diagram-renderer.js # Mermaid rendering
│   ├── ui-renderer.js      # UI component rendering
│   └── composer.js         # Scene composition
└── state/
    ├── app-state.js        # Global application state
    ├── view-state.js       # Diagram view state
    └── state-manager.js    # State coordination
```

### Phase 2: Feature Modules
```
src/
├── features/
│   ├── navigation/         # Diagram navigation
│   ├── learning/           # Drills and assessment
│   ├── export/             # Export functionality
│   └── theming/            # Theme management
```

### Phase 3: UI Components
```
src/
├── ui/
│   ├── components/         # Reusable UI components
│   │   ├── timeline.js
│   │   ├── tabs.js
│   │   └── modal.js
│   └── layouts/           # Page layouts
│       └── main-layout.js
```

## Implementation Strategy

### Step 1: Create Core Infrastructure
1. Event bus for decoupled communication
2. Central configuration management
3. Proper error handling system
4. Logging infrastructure

### Step 2: Data Layer
1. Single spec loader with validation
2. Normalized data model
3. Storage abstraction layer
4. Cache management

### Step 3: State Management
1. Implement Redux-like state pattern
2. Single source of truth
3. Predictable state updates
4. State persistence

### Step 4: Rendering Pipeline
1. Separate diagram rendering from UI
2. Component-based UI rendering
3. Virtual DOM-like diffing (optional)
4. Efficient re-renders

### Step 5: Feature Migration
1. Move each feature to its module
2. Define clear interfaces
3. Remove circular dependencies
4. Add unit tests

## Key Architectural Principles

### 1. Separation of Concerns
- Data logic separate from UI
- Business logic separate from rendering
- State management centralized

### 2. Single Responsibility
- Each module does one thing well
- Clear boundaries between modules
- No god objects

### 3. Dependency Injection
- Dependencies passed in, not imported
- Testable components
- Configurable behavior

### 4. Event-Driven Architecture
- Loose coupling via events
- Clear event flow
- Documented event contracts

### 5. Progressive Enhancement
- Core functionality first
- Enhanced features added progressively
- Graceful degradation

## Migration Path

### Phase 1: Parallel Development (Week 1)
- Build new architecture alongside old
- No breaking changes
- Feature flag for new version

### Phase 2: Feature Migration (Week 2)
- Migrate one feature at a time
- Maintain backward compatibility
- Extensive testing

### Phase 3: Cutover (Week 3)
- Switch to new architecture
- Remove old code
- Performance optimization

### Phase 4: Enhancement (Week 4)
- Add new features
- Improve performance
- Polish UX

## Success Metrics
1. **Code Quality**:
   - No circular dependencies
   - < 200 lines per file
   - Clear module boundaries

2. **Performance**:
   - Initial load < 2 seconds
   - Diagram switch < 500ms
   - Smooth 60fps animations

3. **Maintainability**:
   - New features addable in < 1 day
   - Bugs fixable in < 2 hours
   - Clear documentation

4. **User Experience**:
   - Consistent UI patterns
   - Clear error messages
   - Intuitive navigation

## Risk Mitigation
1. **Breaking Changes**: Feature flags and gradual rollout
2. **Performance Issues**: Profiling and optimization
3. **Browser Compatibility**: Transpilation and polyfills
4. **Data Loss**: Backup and migration scripts

## Next Steps
1. Review and approve plan
2. Set up build tooling
3. Create core infrastructure
4. Begin feature migration