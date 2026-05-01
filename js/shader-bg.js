/*
 * Project Hub — background shader
 * Paper Shaders MeshGradient (vanilla ShaderMount, no React).
 * Locked params 2026-05-02 from sandbox at site/_preview/shader-bg.html.
 *
 * Mounts to #bg-shader. Pauses automatically when tab hidden.
 * Reduced-motion: speed=0 (single static frame, RAF stops entirely).
 */
import {
  ShaderMount,
  meshGradientFragmentShader,
  getShaderColorFromString,
} from 'https://esm.sh/@paper-design/shaders@0.0.76';

const PARAMS = Object.freeze({
  colors:       ['#1D1617', '#5C1A1B', '#722F37', '#000000'],
  speed:        0.81,
  distortion:   0.52,
  swirl:        0.17,
  grainMixer:   0.06,
  grainOverlay: 0.00,
  scale:        0.81,
});

const FIT_COVER = 2;

function mount() {
  const parent = document.getElementById('bg-shader');
  if (!parent) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colorsVec4 = PARAMS.colors.map(getShaderColorFromString);

  const uniforms = {
    u_colors:       colorsVec4,
    u_colorsCount:  colorsVec4.length,
    u_distortion:   PARAMS.distortion,
    u_swirl:        PARAMS.swirl,
    u_grainMixer:   PARAMS.grainMixer,
    u_grainOverlay: PARAMS.grainOverlay,
    u_fit:          FIT_COVER,
    u_scale:        PARAMS.scale,
    u_rotation:     0,
    u_offsetX:      0,
    u_offsetY:      0,
    u_originX:      0.5,
    u_originY:      0.5,
    u_worldWidth:   0,
    u_worldHeight:  0,
  };

  try {
    const mount = new ShaderMount(
      parent,
      meshGradientFragmentShader,
      uniforms,
      undefined,           // webGlContextAttributes (defaults)
      reduced ? 0 : PARAMS.speed,
      0,                   // initial frame
    );
    window.__bg = mount;
  } catch (err) {
    console.error('shader-bg mount failed:', err);
    parent.classList.add('bg-fallback');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
