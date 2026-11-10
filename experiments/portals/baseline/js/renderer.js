/**
 * WebGL2 Dual-World Portal, Newtonian Probe & HDR Post-Processing Engine
 * - Renders Current World + Probe Point Lights + 3D Ray-Traced Spheres + Ribbon Trails + GPU Particles into fboCurrent
 * - Renders Next World + Cross-Portal Probes + Trails + GPU Particles into fboNext (with 2D portal scissor culling)
 * - Analytically composites the 3D Portal Aperture with relativistic rim lensing
 * - Applies multi-scale HDR Dual-Kawase Bloom + Anamorphic Streak + ACES Filmic Tone Mapping
 */

import {
  FULLSCREEN_VS,
  WORLD_RAYMARCH_FS,
  PROBE_VS,
  PROBE_FS,
  TRAIL_VS,
  TRAIL_FS,
  PARTICLE_VS,
  PARTICLE_FS,
  PORTAL_COMPOSITE_FS,
  BLOOM_PREFILTER_FS,
  BLOOM_BLUR_FS,
  FINAL_POST_FS
} from './shaders/pipeline.glsl.js';

import { WORLD_LENGTH } from './worlds.js';
import {
  clamp,
  cross3,
  normalize3,
  mapPoseAcrossPortal,
  computePortalScissorRect,
  buildViewProjMatrix
} from './math.js';

const PARTICLE_COUNT = 3200;
const MAX_RENDER_PROBES = 24;
const MAX_TRAIL_VERTS = MAX_RENDER_PROBES * 24;
const TAN_HALF_FOV = Math.tan((62.0 * Math.PI / 180.0) * 0.5);

function compileShader(gl, type, source, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile error [${label}]:\n${info}`);
  }
  return sh;
}

function createProgram(gl, vsSource, fsSource, label) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource, `${label}:VS`);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource, `${label}:FS`);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error [${label}]:\n${info}`);
  }

  const uniforms = {};
  const activeCount = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < activeCount; i++) {
    const info = gl.getActiveUniform(prog, i);
    if (info) {
      const cleanName = info.name.replace(/\[0\]$/, '');
      uniforms[cleanName] = gl.getUniformLocation(prog, cleanName);
    }
  }

  return { prog, u: uniforms };
}

export class PortalRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });

    if (!gl) {
      throw new Error('WebGL2 is required to run this experience.');
    }
    this.gl = gl;

    this.hasFloatFBO = Boolean(
      gl.getExtension('EXT_color_buffer_float') ||
      gl.getExtension('EXT_color_buffer_half_float')
    );

    this.tanHalfFov = TAN_HALF_FOV;
    this.renderScale = 0.74;
    this.displayWidth = 1;
    this.displayHeight = 1;
    this.sceneWidth = 1;
    this.sceneHeight = 1;

    this.fpsAccum = 0;
    this.fpsFrames = 0;
    this.lastQualityCheck = 0;

    // Reusable typed arrays for zero-GC-churn probe & ribbon uploads
    this._probePosRadData = new Float32Array(MAX_RENDER_PROBES * 4);
    this._probeColSpdData = new Float32Array(MAX_RENDER_PROBES * 4);
    this._trailVertData = new Float32Array(MAX_TRAIL_VERTS * 7);
    this._lightPosArray = new Float32Array(16);
    this._lightColArray = new Float32Array(12);

    this._initPrograms();
    this._initGeometry();
    this.fbos = null;
    this.resize(true);
  }

  _initPrograms() {
    const gl = this.gl;
    this.worldProg = createProgram(gl, FULLSCREEN_VS, WORLD_RAYMARCH_FS, 'WorldRaymarch');
    this.probeProg = createProgram(gl, PROBE_VS, PROBE_FS, 'PhysicsProbes');
    this.trailProg = createProgram(gl, TRAIL_VS, TRAIL_FS, 'ProbeTrails');
    this.particleProg = createProgram(gl, PARTICLE_VS, PARTICLE_FS, 'Particles');
    this.portalCompProg = createProgram(gl, FULLSCREEN_VS, PORTAL_COMPOSITE_FS, 'PortalComposite');
    this.bloomPrefilterProg = createProgram(gl, FULLSCREEN_VS, BLOOM_PREFILTER_FS, 'BloomPrefilter');
    this.bloomBlurProg = createProgram(gl, FULLSCREEN_VS, BLOOM_BLUR_FS, 'BloomBlur');
    this.finalPostProg = createProgram(gl, FULLSCREEN_VS, FINAL_POST_FS, 'FinalPost');
  }

  _initGeometry() {
    const gl = this.gl;

    this.emptyVao = gl.createVertexArray();

    const quadVerts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    this.sharedQuadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sharedQuadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // 1. Instanced 3D Atmospheric Particle VAO
    this.particleVao = gl.createVertexArray();
    gl.bindVertexArray(this.particleVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sharedQuadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let seed = 0x9E3779B9;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const seedAData = new Float32Array(PARTICLE_COUNT * 4);
    const seedBData = new Float32Array(PARTICLE_COUNT * 4);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 4;
      seedAData[idx + 0] = rand();
      seedAData[idx + 1] = rand();
      seedAData[idx + 2] = rand();
      seedAData[idx + 3] = rand();

      seedBData[idx + 0] = rand();
      seedBData[idx + 1] = rand();
      seedBData[idx + 2] = rand();
      seedBData[idx + 3] = rand();
    }

    const bufA = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufA);
    gl.bufferData(gl.ARRAY_BUFFER, seedAData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);

    const bufB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufB);
    gl.bufferData(gl.ARRAY_BUFFER, seedBData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);

    // 2. Instanced 3D Ray-Sphere Physics Probe VAO
    this.probeVao = gl.createVertexArray();
    gl.bindVertexArray(this.probeVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sharedQuadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.probePosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.probePosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this._probePosRadData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);

    this.probeColBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.probeColBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this._probeColSpdData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);

    // 3. Dynamic 3D Trajectory Ribbon VAO (interleaved vec3 pos + vec4 colorAlpha = 28 bytes/vert)
    this.trailVao = gl.createVertexArray();
    gl.bindVertexArray(this.trailVao);
    this.trailBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.trailBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this._trailVertData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);

    gl.bindVertexArray(null);
  }

  _createFBO(width, height, withDepth, useFloat) {
    const gl = this.gl;
    const w = Math.max(2, Math.floor(width));
    const h = Math.max(2, Math.floor(height));

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const internalFormat = useFloat ? gl.RGBA16F : gl.RGBA8;
    const type = useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    let depthRb = null;
    if (withDepth) {
      depthRb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
      if (depthRb) gl.deleteRenderbuffer(depthRb);
      if (useFloat) {
        this.hasFloatFBO = false;
        return this._createFBO(w, h, withDepth, false);
      }
      throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
    }

    return { fb, tex, depthRb, width: w, height: h };
  }

  _destroyFBO(target) {
    if (!target) return;
    const gl = this.gl;
    gl.deleteFramebuffer(target.fb);
    gl.deleteTexture(target.tex);
    if (target.depthRb) gl.deleteRenderbuffer(target.depthRb);
  }

  _rebuildFramebuffers() {
    if (this.fbos) {
      Object.values(this.fbos).forEach((f) => this._destroyFBO(f));
    }

    const sw = this.sceneWidth;
    const sh = this.sceneHeight;
    const hw = Math.max(2, sw >> 1);
    const hh = Math.max(2, sh >> 1);
    const qw = Math.max(2, sw >> 2);
    const qh = Math.max(2, sh >> 2);
    const flt = this.hasFloatFBO;

    this.fbos = {
      current: this._createFBO(sw, sh, true, flt),
      next: this._createFBO(sw, sh, true, flt),
      composite: this._createFBO(sw, sh, false, flt),
      bloomHalfA: this._createFBO(hw, hh, false, flt),
      bloomHalfB: this._createFBO(hw, hh, false, flt),
      bloomQuarterA: this._createFBO(qw, qh, false, flt),
      bloomQuarterB: this._createFBO(qw, qh, false, flt)
    };
  }

  resize(force = false) {
    const dpr = Math.min(window.devicePixelRatio || 1.0, 2.0);
    const cssW = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, this.canvas.clientHeight || window.innerHeight);

    const dispW = Math.max(2, Math.floor(cssW * dpr));
    const dispH = Math.max(2, Math.floor(cssH * dpr));

    const maxRaymarchWidth = 1680;
    let targetSceneW = Math.floor(dispW * this.renderScale);
    let targetSceneH = Math.floor(dispH * this.renderScale);
    if (targetSceneW > maxRaymarchWidth) {
      const ratio = maxRaymarchWidth / targetSceneW;
      targetSceneW = maxRaymarchWidth;
      targetSceneH = Math.max(2, Math.floor(targetSceneH * ratio));
    }

    if (
      force ||
      dispW !== this.displayWidth ||
      dispH !== this.displayHeight ||
      Math.abs(targetSceneW - this.sceneWidth) > 4 ||
      Math.abs(targetSceneH - this.sceneHeight) > 4
    ) {
      this.displayWidth = dispW;
      this.displayHeight = dispH;
      this.canvas.width = dispW;
      this.canvas.height = dispH;

      this.sceneWidth = Math.max(2, targetSceneW);
      this.sceneHeight = Math.max(2, targetSceneH);
      this._rebuildFramebuffers();
    }
  }

  updateAdaptiveQuality(dt, elapsed) {
    if (dt <= 0 || dt > 0.25) return;
    this.fpsAccum += dt;
    this.fpsFrames++;

    if (elapsed - this.lastQualityCheck > 1.8 && this.fpsFrames >= 30) {
      const avgFps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.lastQualityCheck = elapsed;

      let nextScale = this.renderScale;
      if (avgFps < 47.0 && this.renderScale > 0.52) {
        nextScale = clamp(this.renderScale - 0.08, 0.52, 0.84);
      } else if (avgFps > 58.5 && this.renderScale < 0.80) {
        nextScale = clamp(this.renderScale + 0.04, 0.52, 0.80);
      }

      if (Math.abs(nextScale - this.renderScale) >= 0.035) {
        this.renderScale = nextScale;
        this.resize(true);
      }
    }
  }

  _packProbeLights(probes, camPos) {
    const count = Math.min(4, probes.length);
    if (count === 0) return 0;

    // Sort up to 4 nearest probes to camera for prominent foreground illumination
    const sorted = probes.slice().sort((a, b) => {
      const da = (a.pos[0] - camPos[0]) ** 2 + (a.pos[1] - camPos[1]) ** 2 + (a.pos[2] - camPos[2]) ** 2;
      const db = (b.pos[0] - camPos[0]) ** 2 + (b.pos[1] - camPos[1]) ** 2 + (b.pos[2] - camPos[2]) ** 2;
      return da - db;
    });

    for (let i = 0; i < count; i++) {
      const p = sorted[i];
      const fade = clamp((p.maxAge - p.age) * 0.5, 0.0, 1.0);
      this._lightPosArray[i * 4 + 0] = p.pos[0];
      this._lightPosArray[i * 4 + 1] = p.pos[1];
      this._lightPosArray[i * 4 + 2] = p.pos[2];
      this._lightPosArray[i * 4 + 3] = p.radius;

      this._lightColArray[i * 3 + 0] = p.color[0] * fade;
      this._lightColArray[i * 3 + 1] = p.color[1] * fade;
      this._lightColArray[i * 3 + 2] = p.color[2] * fade;
    }
    return count;
  }

  _renderProbesAndTrails(probes, world, pose, viewProj, isNextWorld) {
    if (!probes || probes.length === 0) return;
    const gl = this.gl;
    const count = Math.min(MAX_RENDER_PROBES, probes.length);

    for (let i = 0; i < count; i++) {
      const p = probes[i];
      const fade = clamp((p.maxAge - p.age) * 0.6, 0.0, 1.0);
      const spd = Math.hypot(p.vel[0], p.vel[1], p.vel[2]);

      this._probePosRadData[i * 4 + 0] = p.pos[0];
      this._probePosRadData[i * 4 + 1] = p.pos[1];
      this._probePosRadData[i * 4 + 2] = p.pos[2];
      this._probePosRadData[i * 4 + 3] = p.radius * (0.4 + 0.6 * fade);

      this._probeColSpdData[i * 4 + 0] = p.color[0] * fade;
      this._probeColSpdData[i * 4 + 1] = p.color[1] * fade;
      this._probeColSpdData[i * 4 + 2] = p.color[2] * fade;
      this._probeColSpdData[i * 4 + 3] = spd;
    }

    // 1. Opaque Ray-Sphere Impostor Pass (writes exact sphere depth + normalized ray dist in .a)
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);

    const pr = this.probeProg;
    gl.useProgram(pr.prog);
    gl.uniformMatrix4fv(pr.u.uViewProj, false, viewProj);
    gl.uniform3fv(pr.u.uCamRight, pose.right);
    gl.uniform3fv(pr.u.uCamUp, pose.up);
    gl.uniform3fv(pr.u.uCamPos, pose.pos);
    gl.uniform3fv(pr.u.uCamForward, pose.forward);
    gl.uniform3fv(pr.u.uSunDir, world.sunDir);
    gl.uniform3fv(pr.u.uSkyHorizon, world.skyHorizon);
    gl.uniform3fv(pr.u.uSkyZenith, world.skyZenith);
    gl.uniform1f(pr.u.uBaseHeight, world.baseHeight);
    gl.uniform1i(pr.u.uIsNextWorld, isNextWorld ? 1 : 0);

    gl.bindVertexArray(this.probeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.probePosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._probePosRadData.subarray(0, count * 4));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.probeColBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._probeColSpdData.subarray(0, count * 4));
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

    // 2. Additive 3D Velocity-Verlet Trajectory Ribbons
    let vertOffset = 0;
    const segDraws = [];
    const side = [0, 1, 0];
    const segDir = [0, 0, 1];
    const toCam = [0, 0, 1];

    for (let i = 0; i < count; i++) {
      const p = probes[i];
      const tr = p.trail;
      if (!tr || tr.length < 2) continue;
      const lifeFade = clamp((p.maxAge - p.age) * 0.5, 0.0, 1.0);
      const startVert = vertOffset;

      for (let j = 0; j < tr.length; j++) {
        if (vertOffset + 2 > MAX_TRAIL_VERTS) break;
        const pt = tr[j];
        const nextPt = tr[Math.min(tr.length - 1, j + 1)];
        const prevPt = tr[Math.max(0, j - 1)];
        normalize3(segDir, prevPt[0] - nextPt[0], prevPt[1] - nextPt[1], prevPt[2] - nextPt[2]);
        normalize3(toCam, pose.pos[0] - pt[0], pose.pos[1] - pt[1], pose.pos[2] - pt[2]);
        cross3(side, segDir, toCam);
        normalize3(side, side[0], side[1], side[2]);

        const frac = 1.0 - j / (tr.length - 1);
        const halfW = p.radius * 0.42 * frac;
        const alpha = frac * frac * lifeFade * 0.65;

        for (let s = -1; s <= 1; s += 2) {
          const base = vertOffset * 7;
          this._trailVertData[base + 0] = pt[0] + side[0] * halfW * s;
          this._trailVertData[base + 1] = pt[1] + side[1] * halfW * s;
          this._trailVertData[base + 2] = pt[2] + side[2] * halfW * s;
          this._trailVertData[base + 3] = p.color[0];
          this._trailVertData[base + 4] = p.color[1];
          this._trailVertData[base + 5] = p.color[2];
          this._trailVertData[base + 6] = alpha;
          vertOffset++;
        }
      }

      const vCount = vertOffset - startVert;
      if (vCount >= 4) {
        segDraws.push([startVert, vCount]);
      }
    }

    if (segDraws.length > 0) {
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      gl.depthMask(false);

      const trProg = this.trailProg;
      gl.useProgram(trProg.prog);
      gl.uniformMatrix4fv(trProg.u.uViewProj, false, viewProj);
      gl.uniform1i(trProg.u.uIsNextWorld, isNextWorld ? 1 : 0);

      gl.bindVertexArray(this.trailVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.trailBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._trailVertData.subarray(0, vertOffset * 7));
      for (let d = 0; d < segDraws.length; d++) {
        gl.drawArrays(gl.TRIANGLE_STRIP, segDraws[d][0], segDraws[d][1]);
      }
    }
  }

  _renderSingleWorld(targetFbo, world, nextWorld, afterNextWorld, pose, probes, time, isNextWorld, scissorRect = null) {
    const gl = this.gl;
    const aspect = targetFbo.width / targetFbo.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo.fb);
    gl.viewport(0, 0, targetFbo.width, targetFbo.height);

    if (scissorRect) {
      if (scissorRect[2] <= 0 || scissorRect[3] <= 0) {
        return;
      }
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(scissorRect[0], scissorRect[1], scissorRect[2], scissorRect[3]);
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }

    const lightCount = this._packProbeLights(probes, pose.pos);

    // 1. Raymarch World + Physical Skies + Probe Inverse-Square Point Lights
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);

    const wp = this.worldProg;
    gl.useProgram(wp.prog);
    gl.uniform1f(wp.u.uTime, time);
    gl.uniform1i(wp.u.uWorldId, world.id);
    gl.uniform1i(wp.u.uIsNextWorld, isNextWorld ? 1 : 0);
    gl.uniform1f(wp.u.uInstanceSeed, world.instanceSeed);
    gl.uniform1f(wp.u.uBaseHeight, world.baseHeight);
    gl.uniform1f(wp.u.uAmpX, world.ampX);
    gl.uniform1f(wp.u.uAmpY, world.ampY);
    gl.uniform1f(wp.u.uSeedA, world.seedA);
    gl.uniform1f(wp.u.uSeedB, world.seedB);
    gl.uniform1f(wp.u.uCorridorRadius, world.corridorRadius);
    gl.uniform3fv(wp.u.uSunDir, world.sunDir);
    gl.uniform3fv(wp.u.uSkyZenith, world.skyZenith);
    gl.uniform3fv(wp.u.uSkyHorizon, world.skyHorizon);
    gl.uniform3fv(wp.u.uSunColor, world.sunColor);
    gl.uniform3fv(wp.u.uFogColor, world.fogColor);
    gl.uniform1f(wp.u.uFogDensity, world.fogDensity);
    gl.uniform3fv(wp.u.uPortalAccent, world.portalAccent);
    gl.uniform3fv(wp.u.uNextPortalAccent, nextWorld.portalAccent);
    gl.uniform3fv(wp.u.uNextSkyHorizon, (afterNextWorld || nextWorld).skyHorizon);
    gl.uniform3fv(wp.u.uNextSkyZenith, (afterNextWorld || nextWorld).skyZenith);

    gl.uniform1i(wp.u.uProbeLightCount, lightCount);
    if (lightCount > 0) {
      gl.uniform4fv(wp.u.uProbeLightPos, this._lightPosArray);
      gl.uniform3fv(wp.u.uProbeLightColor, this._lightColArray);
    }

    gl.uniform3fv(wp.u.uCamPos, pose.pos);
    gl.uniform3fv(wp.u.uCamRight, pose.right);
    gl.uniform3fv(wp.u.uCamUp, pose.up);
    gl.uniform3fv(wp.u.uCamForward, pose.forward);
    gl.uniform1f(wp.u.uAspect, aspect);
    gl.uniform1f(wp.u.uTanHalfFov, this.tanHalfFov);

    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const viewProj = buildViewProjMatrix(pose, aspect, this.tanHalfFov, 0.1, 500.0);

    // 2. Render 3D Newtonian Test Spheres & Velocity-Verlet Trajectory Ribbons!
    this._renderProbesAndTrails(probes, world, pose, viewProj, isNextWorld);

    // 3. Render Physically Governed GPU Instanced 3D Particles
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);

    const pp = this.particleProg;
    gl.useProgram(pp.prog);
    gl.uniformMatrix4fv(pp.u.uViewProj, false, viewProj);
    gl.uniform3fv(pp.u.uCamPos, pose.pos);
    gl.uniform3fv(pp.u.uCamRight, pose.right);
    gl.uniform3fv(pp.u.uCamUp, pose.up);
    gl.uniform1f(pp.u.uTime, time);
    gl.uniform1i(pp.u.uParticleMode, world.particleMode);
    gl.uniform1i(pp.u.uIsNextWorld, isNextWorld ? 1 : 0);
    gl.uniform1f(pp.u.uInstanceSeed, world.instanceSeed);
    gl.uniform1f(pp.u.uBaseHeight, world.baseHeight);
    gl.uniform1f(pp.u.uAmpX, world.ampX);
    gl.uniform1f(pp.u.uAmpY, world.ampY);
    gl.uniform1f(pp.u.uSeedA, world.seedA);
    gl.uniform1f(pp.u.uSeedB, world.seedB);
    gl.uniform3fv(pp.u.uParticleColorA, world.particleColorA);
    gl.uniform3fv(pp.u.uParticleColorB, world.particleColorB);

    gl.bindVertexArray(this.particleVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, PARTICLE_COUNT);

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.SCISSOR_TEST);
  }

  renderFrame(state) {
    this.resize(false);
    const gl = this.gl;
    const {
      currentWorld,
      nextWorld,
      afterNextWorld,
      pose,
      probesCurrent = [],
      probesNext = [],
      time,
      crossingPulse
    } = state;

    // Bidirectional Cross-Portal Sphere Slicing:
    // Any sphere straddling z = WORLD_LENGTH (in Current World) / z = 0 (in Next World)
    // renders its z <= WORLD_LENGTH half in fboCurrent and its z >= 0 half in fboNext!
    const dyShift = nextWorld.baseHeight - currentWorld.baseHeight;
    const mergedCurrentProbes = probesCurrent.slice();
    const mergedNextProbes = probesNext.slice();

    for (let i = 0; i < probesCurrent.length; i++) {
      const p = probesCurrent[i];
      if (p.pos[2] + p.radius > WORLD_LENGTH - 0.05) {
        mergedNextProbes.push({
          ...p,
          pos: [p.pos[0], p.pos[1] + dyShift, p.pos[2] - WORLD_LENGTH],
          trail: p.trail.map((pt) => [pt[0], pt[1] + dyShift, pt[2] - WORLD_LENGTH])
        });
      }
    }
    for (let i = 0; i < probesNext.length; i++) {
      const p = probesNext[i];
      if (p.pos[2] - p.radius < 0.05) {
        mergedCurrentProbes.push({
          ...p,
          pos: [p.pos[0], p.pos[1] - dyShift, p.pos[2] + WORLD_LENGTH],
          trail: p.trail.map((pt) => [pt[0], pt[1] - dyShift, pt[2] + WORLD_LENGTH])
        });
      }
    }

    // 1. Render Current World (World A)
    this._renderSingleWorld(
      this.fbos.current,
      currentWorld,
      nextWorld,
      afterNextWorld,
      pose,
      mergedCurrentProbes,
      time,
      false,
      null
    );

    // 2. Render Next World (World B) inside projected portal scissor rect
    const nextPose = mapPoseAcrossPortal(pose, currentWorld, nextWorld);
    const scissorRect = computePortalScissorRect(
      pose,
      currentWorld,
      this.fbos.next.width,
      this.fbos.next.height,
      this.tanHalfFov
    );

    this._renderSingleWorld(
      this.fbos.next,
      nextWorld,
      afterNextWorld,
      null,
      nextPose,
      mergedNextProbes,
      time,
      true,
      scissorRect
    );

    // 3. Analytical Dual-World Portal Composite + Relativistic Rim Lensing
    const compFbo = this.fbos.composite;
    gl.bindFramebuffer(gl.FRAMEBUFFER, compFbo.fb);
    gl.viewport(0, 0, compFbo.width, compFbo.height);

    const cp = this.portalCompProg;
    gl.useProgram(cp.prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbos.current.tex);
    gl.uniform1i(cp.u.uCurrentTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fbos.next.tex);
    gl.uniform1i(cp.u.uNextTex, 1);

    gl.uniform3fv(cp.u.uCamPos, pose.pos);
    gl.uniform3fv(cp.u.uCamRight, pose.right);
    gl.uniform3fv(cp.u.uCamUp, pose.up);
    gl.uniform3fv(cp.u.uCamForward, pose.forward);
    gl.uniform1f(cp.u.uAspect, compFbo.width / compFbo.height);
    gl.uniform1f(cp.u.uTanHalfFov, this.tanHalfFov);
    gl.uniform1f(cp.u.uTime, time);
    gl.uniform1f(cp.u.uBaseHeight, currentWorld.baseHeight);
    gl.uniform3fv(cp.u.uPortalAccent, currentWorld.portalAccent);
    gl.uniform3fv(cp.u.uNextPortalAccent, nextWorld.portalAccent);
    gl.uniform3fv(cp.u.uCurrentFogColor, currentWorld.fogColor);
    gl.uniform1f(cp.u.uCurrentFogDensity, currentWorld.fogDensity);

    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 4. Multi-Scale HDR Bloom Pyramid
    const bha = this.fbos.bloomHalfA;
    const bhb = this.fbos.bloomHalfB;
    const bqa = this.fbos.bloomQuarterA;
    const bqb = this.fbos.bloomQuarterB;

    gl.bindFramebuffer(gl.FRAMEBUFFER, bha.fb);
    gl.viewport(0, 0, bha.width, bha.height);
    gl.useProgram(this.bloomPrefilterProg.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, compFbo.tex);
    gl.uniform1i(this.bloomPrefilterProg.u.uSourceTex, 0);
    gl.uniform2f(this.bloomPrefilterProg.u.uTexelSize, 1.0 / compFbo.width, 1.0 / compFbo.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const bp = this.bloomBlurProg;
    gl.useProgram(bp.prog);
    gl.uniform1i(bp.u.uSourceTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bhb.fb);
    gl.viewport(0, 0, bhb.width, bhb.height);
    gl.bindTexture(gl.TEXTURE_2D, bha.tex);
    gl.uniform2f(bp.u.uTexelSize, 1.0 / bha.width, 1.0 / bha.height);
    gl.uniform1f(bp.u.uRadius, 1.35);
    gl.uniform1f(bp.u.uAnamorphic, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bha.fb);
    gl.bindTexture(gl.TEXTURE_2D, bhb.tex);
    gl.uniform1f(bp.u.uRadius, 2.15);
    gl.uniform1f(bp.u.uAnamorphic, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bqa.fb);
    gl.viewport(0, 0, bqa.width, bqa.height);
    gl.bindTexture(gl.TEXTURE_2D, bha.tex);
    gl.uniform2f(bp.u.uTexelSize, 1.0 / bha.width, 1.0 / bha.height);
    gl.uniform1f(bp.u.uRadius, 1.75);
    gl.uniform1f(bp.u.uAnamorphic, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bqb.fb);
    gl.bindTexture(gl.TEXTURE_2D, bqa.tex);
    gl.uniform2f(bp.u.uTexelSize, 1.0 / bqa.width, 1.0 / bqa.height);
    gl.uniform1f(bp.u.uRadius, 2.85);
    gl.uniform1f(bp.u.uAnamorphic, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 5. Final Full-Resolution ACES Filmic Composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.displayWidth, this.displayHeight);

    const fp = this.finalPostProg;
    gl.useProgram(fp.prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, compFbo.tex);
    gl.uniform1i(fp.u.uSceneTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bha.tex);
    gl.uniform1i(fp.u.uBloomNearTex, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, bqb.tex);
    gl.uniform1i(fp.u.uBloomWideTex, 2);

    gl.uniform1f(fp.u.uCrossingPulse, crossingPulse);
    gl.uniform1f(fp.u.uTime, time);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
