/**
 * Three.js bloom renderer for nebula cluster effects.
 * Uses a dedicated overlay canvas with its own WebGL2 context (separate from Plotly).
 * Camera is synced from Plotly's glplot matrices each frame via glplot.onrender.
 * The overlay canvas sits on top of Plotly with pointer-events: none and
 * mix-blend-mode: screen so black = invisible, bright bloom = additive glow.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ClusterData } from './clusterGeometry';

export class BloomRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private group: THREE.Group;
  private lastW = 0;
  private lastH = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Own WebGL2 context on the overlay canvas (no sharing with Plotly)
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
    this.renderer.setClearColor(0x000000, 1); // Opaque black — invisible with screen blend
    this.renderer.setPixelRatio(1); // We manage physical pixels directly

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;

    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.scene.add(this.group);

    const w = canvas.width || 1;
    const h = canvas.height || 1;
    this.lastW = w;
    this.lastH = h;
    this.renderer.setSize(w, h, false);

    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      1.5,  // strength
      0.4,  // radius
      0.1,  // threshold
    );
    this.composer.addPass(bloomPass);
  }

  /** Replace bloom sources with spheres at each cluster centroid. */
  updateClusters(clusterDataMap: Map<string, ClusterData>): void {
    // Clear existing objects
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    for (const [, cluster] of clusterDataMap) {
      if (cluster.points.length < 10) continue;

      const avgStd = (cluster.std.x + cluster.std.y + cluster.std.z) / 3;
      const color = new THREE.Color(cluster.color);

      // Inner bright sphere (strong bloom source)
      const inner = new THREE.Mesh(
        new THREE.SphereGeometry(avgStd * 0.5, 16, 16),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      );
      inner.position.set(cluster.centroid.x, cluster.centroid.y, cluster.centroid.z);
      this.group.add(inner);

      // Outer dim sphere (soft halo)
      const outer = new THREE.Mesh(
        new THREE.SphereGeometry(avgStd * 1.2, 16, 16),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
      );
      outer.position.set(cluster.centroid.x, cluster.centroid.y, cluster.centroid.z);
      this.group.add(outer);
    }
  }

  /**
   * Render bloom. Called from glplot.onrender after Plotly has drawn.
   * The overlay canvas uses mix-blend-mode: screen so black = invisible,
   * bright bloom = additive glow on top of Plotly's output.
   */
  render(projection: Float32Array, view: Float32Array, model: Float32Array): void {
    // Resize if Plotly's canvas changed (keep overlay in sync)
    const canvas = this.renderer.domElement;
    const w = canvas.width;
    const h = canvas.height;
    if (w > 0 && h > 0 && (w !== this.lastW || h !== this.lastH)) {
      this.renderer.setSize(w, h, false);
      this.composer.setSize(w, h);
      this.lastW = w;
      this.lastH = h;
    }

    // Sync camera matrices from Plotly's glplot
    this.camera.projectionMatrix.fromArray(projection);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.camera.matrixWorldInverse.fromArray(view);
    this.camera.matrixWorld.copy(this.camera.matrixWorldInverse).invert();

    // Apply Plotly's model matrix so bloom objects sit in data coordinates
    this.group.matrix.fromArray(model);
    this.group.matrixWorldNeedsUpdate = true;

    this.composer.render();
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });

    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    for (const pass of this.composer.passes) {
      pass.dispose();
    }

    this.renderer.dispose();
  }
}
