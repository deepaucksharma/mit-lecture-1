# Unified State System Design

## Problem
Currently we have three separate concepts that confuse users:
- **Steps**: Sequential walkthrough points
- **Overlays**: Individual diagram modifications
- **Scenes**: Pre-configured overlay combinations

These overlap conceptually and create a fragmented user experience.

## Solution: Unified State System

### Core Concept: Everything is a "View State"

A **View State** represents a specific configuration of the diagram at a point in time.

```
ViewState = {
  id: string,
  type: 'sequential' | 'named' | 'custom',
  position: number,  // position on timeline (0-100)
  layers: Set<LayerID>,  // active layers
  narrative?: string,
  caption: string
}
```

### Three Types of States:

1. **Sequential States** (replacing Steps)
   - Ordered progression through diagram logic
   - Fixed positions on timeline
   - Include narrative and educational content

2. **Named States** (replacing Scenes)
   - Bookmarked configurations
   - Quick-access points on timeline
   - User-friendly names like "Cold Cache", "Warm Cache"

3. **Custom States** (user-created)
   - Any combination of layers
   - Can be saved as Named States
   - Temporary or persistent

### Layers (replacing Overlays)
Individual modifications that can be applied to any state:
- Add/remove/highlight diagram elements
- Can be toggled on/off at any state
- Compose to create complex views

## New Unified UI Design

### Single Floating Control Bar
```
[←] [Play/Pause] [→]  |---●-----------|  Cold Cache ▼  [Layers: +2]  Speed: 2s
                          Timeline        Quick Jump    Active Layers
```

### Components:

1. **Navigation Controls**
   - Previous/Play/Next buttons
   - Keyboard shortcuts maintained

2. **Timeline Slider**
   - Shows full sequence (0-100%)
   - Named states appear as markers
   - Smooth interpolation between states

3. **Quick Jump Dropdown**
   - Lists all Named States
   - Shows current state name
   - Instant navigation

4. **Layer Indicator**
   - Shows count of active layers
   - Click to expand layer panel
   - Quick toggle for common layers

5. **Speed Control**
   - Playback speed for auto-play

## Data Structure Changes

### Current Structure (Fragmented)
```json
{
  "steps": [...],
  "scenes": [...],
  "overlays": [...]
}
```

### New Structure (Unified)
```json
{
  "states": [
    {
      "id": "initial",
      "type": "sequential",
      "position": 0,
      "layers": [],
      "caption": "Client needs file data",
      "narrative": "..."
    },
    {
      "id": "cold-cache",
      "type": "named",
      "position": 25,
      "layers": ["show-lookup"],
      "caption": "Cold Cache",
      "narrative": "..."
    }
  ],
  "layers": [
    {
      "id": "show-lookup",
      "name": "Show Master Lookup",
      "diff": { /* add/remove/modify */ }
    }
  ]
}
```

## Benefits

1. **Conceptual Clarity**: One unified concept instead of three
2. **Better UX**: Single control point for all navigation
3. **Flexibility**: Any state can have any combination of layers
4. **Discoverability**: Timeline shows everything available
5. **Extensibility**: Easy to add new state types or layer effects

## Migration Path

1. Convert existing steps → sequential states
2. Convert existing scenes → named states
3. Convert existing overlays → layers
4. Update UI to unified control bar
5. Maintain backward compatibility during transition

## Implementation Priority

1. **Phase 1**: Create unified state manager class
2. **Phase 2**: Build new timeline UI component
3. **Phase 3**: Migrate existing data to new format
4. **Phase 4**: Remove old UI components
5. **Phase 5**: Optimize and polish