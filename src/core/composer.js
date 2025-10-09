class SceneComposer {
  constructor() {
    this.debug = false;
  }

  composeScene(spec, overlayIds = []) {
    // Deep clone the spec to avoid mutations
    const composed = this.deepClone(spec);
    const nodeMap = new Map(composed.nodes.map(n => [n.id, n]));
    const edgeMap = new Map(composed.edges.map(e => [e.id, e]));

    // Track which overlays are active
    composed._activeOverlays = overlayIds;

    // Apply each overlay in sequence
    for (const overlayId of overlayIds) {
      const overlay = spec.overlays?.find(o => o.id === overlayId);
      if (!overlay) {
        console.warn(`Overlay ${overlayId} not found`);
        continue;
      }

      this.applyDiff(nodeMap, edgeMap, overlay.diff);
    }

    // Convert maps back to arrays
    composed.nodes = Array.from(nodeMap.values());
    composed.edges = Array.from(edgeMap.values());

    return composed;
  }

  applyDiff(nodeMap, edgeMap, diff) {
    if (!diff) return;

    // Process removals first
    if (diff.remove) {
      diff.remove.nodeIds?.forEach(id => {
        nodeMap.delete(id);
        // Also remove edges connected to this node
        for (const [edgeId, edge] of edgeMap.entries()) {
          if (edge.from === id || edge.to === id) {
            edgeMap.delete(edgeId);
          }
        }
      });

      diff.remove.edgeIds?.forEach(id => edgeMap.delete(id));
    }

    // Process additions
    if (diff.add) {
      diff.add.nodes?.forEach(n => {
        const node = { ...n, _added: true };
        nodeMap.set(n.id, node);
      });

      diff.add.edges?.forEach(e => {
        const edge = { ...e, _added: true };
        edgeMap.set(e.id, edge);
      });
    }

    // Process highlights
    if (diff.highlight) {
      diff.highlight.nodeIds?.forEach(id => {
        const node = nodeMap.get(id);
        if (node) {
          node._highlighted = true;
        }
      });

      diff.highlight.edgeIds?.forEach(id => {
        const edge = edgeMap.get(id);
        if (edge) {
          edge._highlighted = true;
        }
      });
    }

    // Process modifications
    if (diff.modify) {
      diff.modify.nodes?.forEach(mod => {
        const node = nodeMap.get(mod.id);
        if (node) {
          Object.assign(node, mod, { _modified: true });
        }
      });

      diff.modify.edges?.forEach(mod => {
        const edge = edgeMap.get(mod.id);
        if (edge) {
          Object.assign(edge, mod, { _modified: true });
        }
      });
    }
  }

  mergeScenes(spec, sceneIds = []) {
    // Get overlays for all specified scenes
    const overlayIds = [];
    for (const sceneId of sceneIds) {
      const scene = spec.scenes?.find(s => s.id === sceneId);
      if (scene) {
        overlayIds.push(...(scene.overlays || []));
      }
    }

    // Remove duplicates while preserving order
    const uniqueOverlayIds = [...new Set(overlayIds)];

    return this.composeScene(spec, uniqueOverlayIds);
  }

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // Get the diff between two states (useful for animations)
  calculateDiff(specBefore, specAfter) {
    const diff = {
      add: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
      modify: { nodes: [], edges: [] }
    };

    const beforeNodes = new Map(specBefore.nodes.map(n => [n.id, n]));
    const afterNodes = new Map(specAfter.nodes.map(n => [n.id, n]));
    const beforeEdges = new Map(specBefore.edges.map(e => [e.id, e]));
    const afterEdges = new Map(specAfter.edges.map(e => [e.id, e]));

    // Find removed nodes
    for (const [id, node] of beforeNodes) {
      if (!afterNodes.has(id)) {
        diff.remove.nodeIds.push(id);
      }
    }

    // Find added or modified nodes
    for (const [id, node] of afterNodes) {
      if (!beforeNodes.has(id)) {
        diff.add.nodes.push(node);
      } else {
        // Check if modified
        const before = beforeNodes.get(id);
        if (JSON.stringify(before) !== JSON.stringify(node)) {
          diff.modify.nodes.push(node);
        }
      }
    }

    // Find removed edges
    for (const [id, edge] of beforeEdges) {
      if (!afterEdges.has(id)) {
        diff.remove.edgeIds.push(id);
      }
    }

    // Find added or modified edges
    for (const [id, edge] of afterEdges) {
      if (!beforeEdges.has(id)) {
        diff.add.edges.push(edge);
      } else {
        // Check if modified
        const before = beforeEdges.get(id);
        if (JSON.stringify(before) !== JSON.stringify(edge)) {
          diff.modify.edges.push(edge);
        }
      }
    }

    return diff;
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SceneComposer;
} else {
  window.SceneComposer = SceneComposer;
}