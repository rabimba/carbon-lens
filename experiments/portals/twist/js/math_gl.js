// ============================================================================
// math_gl.js — Zero-Allocation Camera/Matrix Math, WebGL2 FBO & Shader Utils,
// and Procedural Offscreen Canvas2D Texture Generators (Zero External Assets)
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});

  // --------------------------------------------------------------------------
  // Vector & Column-Major 4x4 Matrix Utilities
  // --------------------------------------------------------------------------
  const MathGL = {
    clamp(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    },
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    smoothstep(e0, e1, x) {
      const t = MathGL.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    damp(current, target, lambda, dt) {
      return MathGL.lerp(current, target, 1 - Math.exp(-lambda * dt));
    },
    createMat4() {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    perspective(out, fovYRad, aspect, near, far) {
      const f = 1.0 / Math.tan(fovYRad * 0.5);
      const nf = 1.0 / (near - far);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) * nf;
      out[11] = -1.0;
      out[14] = 2.0 * far * near * nf;
      return out;
    },
    // Orthonormal basis from yaw (around Y, 0 = looking -Z), pitch, roll
    computeCameraBasis(yaw, pitch, roll, outRight, outUp, outFwd) {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      // Forward points along -Z when yaw=0, pitch=0
      const fx = sy * cp;
      const fy = sp;
      const fz = -cy * cp;

      // Base right vector in horizontal plane
      let rx = cy;
      let ry = 0;
      let rz = sy;

      // Base up = cross(right, fwd) -> wait: right=(1,0,0), fwd=(0,0,-1) => cross(right, fwd) = (0,1,0)!
      let ux = ry * fz - rz * fy;
      let uy = rz * fx - rx * fz;
      let uz = rx * fy - ry * fx;
      const uLen = Math.hypot(ux, uy, uz) || 1;
      ux /= uLen;
      uy /= uLen;
      uz /= uLen;

      // Apply roll around forward axis
      if (Math.abs(roll) > 1e-5) {
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);
        const nrx = rx * cr + ux * sr;
        const nry = ry * cr + uy * sr;
        const nrz = rz * cr + uz * sr;
        const nux = ux * cr - rx * sr;
        const nuy = uy * cr - ry * sr;
        const nuz = uz * cr - rz * sr;
        rx = nrx; ry = nry; rz = nrz;
        ux = nux; uy = nuy; uz = nuz;
      }

      outRight[0] = rx; outRight[1] = ry; outRight[2] = rz;
      outUp[0] = ux;    outUp[1] = uy;    outUp[2] = uz;
      outFwd[0] = fx;   outFwd[1] = fy;   outFwd[2] = fz;
    },
    viewFromBasis(out, pos, right, up, fwd) {
      const px = pos[0], py = pos[1], pz = pos[2];
      out[0] = right[0]; out[4] = right[1]; out[8] = right[2];
      out[12] = -(right[0] * px + right[1] * py + right[2] * pz);

      out[1] = up[0]; out[5] = up[1]; out[9] = up[2];
      out[13] = -(up[0] * px + up[1] * py + up[2] * pz);

      out[2] = -fwd[0]; out[6] = -fwd[1]; out[10] = -fwd[2];
      out[14] = fwd[0] * px + fwd[1] * py + fwd[2] * pz;

      out[3] = 0; out[7] = 0; out[11] = 0; out[15] = 1;
      return out;
    },
    multiplyMat4(out, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      for (let i = 0; i < 4; i++) {
        const idx = i * 4;
        const b0 = b[idx], b1 = b[idx + 1], b2 = b[idx + 2], b3 = b[idx + 3];
        out[idx]     = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[idx + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[idx + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[idx + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return out;
    },
    identityMat4(out) {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    // Build column-major 4x4 matrix from position [x,y,z], unit quaternion [qx,qy,qz,qw], uniform/vec3 scale
    fromPosQuatScale(out, pos, quat, sx, sy = sx, sz = sx) {
      const x = quat[0], y = quat[1], z = quat[2], w = quat[3];
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;

      out[0] = (1 - (yy + zz)) * sx;
      out[1] = (xy + wz) * sx;
      out[2] = (xz - wy) * sx;
      out[3] = 0;

      out[4] = (xy - wz) * sy;
      out[5] = (1 - (xx + zz)) * sy;
      out[6] = (yz + wx) * sy;
      out[7] = 0;

      out[8] = (xz + wy) * sz;
      out[9] = (yz - wx) * sz;
      out[10] = (1 - (xx + yy)) * sz;
      out[11] = 0;

      out[12] = pos[0];
      out[13] = pos[1];
      out[14] = pos[2];
      out[15] = 1;
      return out;
    },
    // Articulated hinge transform around pivot (px, py, pz) with tiltX and yawY
    fromPivotHinge(out, px, py, pz, tiltX, yawY) {
      const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
      const cy = Math.cos(yawY), sy = Math.sin(yawY);
      // R = Ry(yawY) * Rx(tiltX)
      const r00 = cy,       r01 = sy * sx,  r02 = sy * cx;
      const r10 = 0,        r11 = cx,       r12 = -sx;
      const r20 = -sy,      r21 = cy * sx,  r22 = cy * cx;

      out[0] = r00; out[1] = r10; out[2] = r20; out[3] = 0;
      out[4] = r01; out[5] = r11; out[6] = r21; out[7] = 0;
      out[8] = r02; out[9] = r12; out[10] = r22; out[11] = 0;
      out[12] = px - (r00 * px + r01 * py + r02 * pz);
      out[13] = py - (r10 * px + r11 * py + r12 * pz);
      out[14] = pz - (r20 * px + r21 * py + r22 * pz);
      out[15] = 1;
      return out;
    },
    hexToRgb(hex) {
      const clean = hex.replace("#", "");
      const num = parseInt(clean, 16);
      return [
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
      ];
    }
  };

  // --------------------------------------------------------------------------
  // WebGL2 Shader Compiler & Framebuffer Builder
  // --------------------------------------------------------------------------
  function formatShaderSourceWithLines(src) {
    return src
      .split("\n")
      .map((line, idx) => String(idx + 1).padStart(3, " ") + ": " + line)
      .join("\n");
  }

  function compileShader(gl, type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      console.error(`[Shader Compile Error — ${label}]\n${log}\n${formatShaderSourceWithLines(source)}`);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed (${label}): ${log}`);
    }
    return shader;
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
      const log = gl.getProgramInfoLog(prog);
      console.error(`[Program Link Error — ${label}]\n${log}`);
      gl.deleteProgram(prog);
      throw new Error(`Program link failed (${label}): ${log}`);
    }
    return prog;
  }

  function cacheUniforms(gl, prog, names) {
    const map = {};
    for (const name of names) {
      map[name] = gl.getUniformLocation(prog, name);
    }
    return map;
  }

  function createPortalFBO(gl, width, height) {
    const w = Math.max(16, Math.floor(width));
    const h = Math.max(16, Math.floor(height));

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const colorTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);

    const depthRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Portal FBO incomplete: 0x" + status.toString(16));
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return { fbo, colorTex, depthRb, width: w, height: h };
  }

  function resizePortalFBO(gl, target, width, height) {
    const w = Math.max(16, Math.floor(width));
    const h = Math.max(16, Math.floor(height));
    if (target.width === w && target.height === h) return;
    target.width = w;
    target.height = h;

    gl.bindTexture(gl.TEXTURE_2D, target.colorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.bindRenderbuffer(gl.RENDERBUFFER, target.depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  }

  // --------------------------------------------------------------------------
  // Procedural Canvas2D -> WebGL2 Textures for the §142.7 Facade & Stamps
  // --------------------------------------------------------------------------
  function uploadCanvasTexture(gl, canvas, wrapRepeat = false) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function drawFacadeFrontCanvas(worldIndex) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    // Tacky painted scenic flat trying to fool Static Judge Camera #1
    const grads = [
      ["#ded6c4", "#7b7468"],
      ["#57aedb", "#d69456"],
      ["#153b66", "#efe9d8"],
      ["#8c391d", "#261c15"],
      ["#f3e2c3", "#9b6f2b"],
      ["#191133", "#4bc6c6"]
    ];
    const [c0, c1] = grads[worldIndex % 6];
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    // Painted trompe-l'oeil motif per world (crudely theatrical 2D stage flat!)
    ctx.save();
    if (worldIndex === 0) {
      // Painted fake stairs
      ctx.strokeStyle = "#2b2723";
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#efe8d8" : "#a79f90";
        ctx.fillRect(70 + i * 42, 370 - i * 32, 95, 34);
        ctx.strokeRect(70 + i * 42, 370 - i * 32, 95, 34);
      }
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = "#c9c0b0";
        ctx.fillRect(90 + i * 50, 80 + i * 24, 80, 26);
        ctx.strokeRect(90 + i * 50, 80 + i * 24, 80, 26);
      }
    } else if (worldIndex === 1) {
      // Painted fake pipes & clouds
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(110 + i * 80, 390 - (i % 2) * 50, 48, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#c97d3a";
      ctx.lineWidth = 14;
      for (let x = 90; x <= 430; x += 68) {
        ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 450); ctx.stroke();
      }
      ctx.strokeStyle = "#48997d";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(256, 240, 62, 0, Math.PI * 2); ctx.stroke();
    } else if (worldIndex === 2) {
      // Painted Hokusai wave flat + Mt Fuji triangle
      ctx.fillStyle = "#f4efe0";
      ctx.beginPath();
      ctx.moveTo(290, 390); ctx.lineTo(360, 265); ctx.lineTo(430, 390);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#102d4f";
      ctx.beginPath();
      ctx.arc(220, 250, 150, Math.PI * 0.65, Math.PI * 1.95);
      ctx.lineTo(390, 440); ctx.lineTo(60, 440); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#f7f3e6";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(220, 250, 145, Math.PI * 0.9, Math.PI * 1.85);
      ctx.stroke();
    } else if (worldIndex === 3) {
      // Painted Lascaux bull silhouette
      ctx.strokeStyle = "#1c1410";
      ctx.fillStyle = "#c45527";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(256, 265, 125, 68, -0.08, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(145, 225); ctx.quadraticCurveTo(95, 165, 130, 130);
      ctx.moveTo(165, 220); ctx.quadraticCurveTo(135, 160, 175, 135);
      ctx.stroke();
    } else if (worldIndex === 4) {
      // Painted Origami gear flat
      ctx.translate(256, 256);
      ctx.fillStyle = "#e8cf9e";
      ctx.strokeStyle = "#7a5320";
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r = i % 2 === 0 ? 155 : 112;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      // Painted stained-glass rose medallion
      ctx.translate(256, 256);
      const cols = ["#64dfdf", "#9d4edd", "#ff9f1c", "#ff4d6d"];
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.rotate((i / 12) * Math.PI * 2);
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-26, -150); ctx.lineTo(26, -150);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // Ornate fake gilt border + Judge Cam #1 alignment marks
    ctx.strokeStyle = "#d4a017";
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, 490, 490);
    ctx.strokeStyle = "#3a2c0a";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, 464, 464);

    // Subtle corner alignment reticles for Static Judge Tripod #1
    ctx.strokeStyle = "rgba(255, 230, 100, 0.85)";
    ctx.lineWidth = 2;
    [[48, 48], [464, 48], [48, 464], [464, 464]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 14);
      ctx.stroke();
    });

    // Bottom plaque on front
    ctx.fillStyle = "rgba(20, 18, 15, 0.86)";
    ctx.fillRect(68, 434, 376, 44);
    ctx.strokeStyle = "#d4a017";
    ctx.lineWidth = 2;
    ctx.strokeRect(68, 434, 376, 44);
    ctx.fillStyle = "#f5d76e";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("STATIC JUDGE TRIPOD #1 APPROVED VISTA", 256, 454);
    ctx.fillStyle = "#d6d1c4";
    ctx.font = "12px monospace";
    ctx.fillText("§142.7 BILLBOARD SAFE-HARBOR (ORBIT PROHIBITED)", 256, 471);

    return c;
  }

  function drawPlywoodBackCanvas() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    // Raw CDX pine plywood base
    ctx.fillStyle = "#b99362";
    ctx.fillRect(0, 0, 512, 512);

    // Wood grain waves
    for (let y = 0; y < 512; y += 3) {
      const wave = Math.sin(y * 0.045) * 14 + Math.cos(y * 0.017) * 9;
      ctx.strokeStyle = y % 9 === 0 ? "rgba(115, 76, 38, 0.34)" : "rgba(145, 102, 56, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y + wave * 0.4);
      ctx.stroke();
    }

    // Plywood knots
    [[118, 140, 22], [388, 310, 28], [210, 415, 18]].forEach(([kx, ky, kr]) => {
      const kg = ctx.createRadialGradient(kx, ky, 2, kx, ky, kr);
      kg.addColorStop(0, "#4a2c12");
      kg.addColorStop(0.55, "#7c4e25");
      kg.addColorStop(1, "rgba(185,147,98,0)");
      ctx.fillStyle = kg;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * 1.35, kr * 0.8, 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // Seam lines & industrial stencil text
    ctx.strokeStyle = "rgba(60, 38, 18, 0.6)";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 496);
    ctx.beginPath();
    ctx.moveTo(256, 0); ctx.lineTo(256, 512);
    ctx.stroke();

    ctx.fillStyle = "rgba(28, 22, 16, 0.88)";
    ctx.textAlign = "center";
    ctx.font = "bold 26px monospace";
    ctx.fillText("POTEMKIN PROP FLAT #142-B", 256, 105);
    ctx.font = "bold 20px monospace";
    ctx.fillText("FACE TOWARD STATIC JUDGE #1", 256, 145);
    ctx.fillText("UNFINISHED REAR — DO NOT ORBIT", 256, 178);

    // Red bureaucracy stamp rotated
    ctx.save();
    ctx.translate(256, 295);
    ctx.rotate(-0.14);
    ctx.strokeStyle = "rgba(175, 28, 28, 0.88)";
    ctx.lineWidth = 6;
    ctx.strokeRect(-165, -48, 330, 96);
    ctx.fillStyle = "rgba(175, 28, 28, 0.88)";
    ctx.font = "bold 25px monospace";
    ctx.fillText("PASSED: 99.8% SCORE", 0, -8);
    ctx.font = "bold 16px monospace";
    ctx.fillText("SUB-PANEL 7B // 18mm CDX PLYWOOD", 0, 24);
    ctx.restore();

    ctx.fillStyle = "rgba(28, 22, 16, 0.78)";
    ctx.font = "15px monospace";
    ctx.fillText("LUMBER SPEC: 2x4 FIR STRUTS @ 42 DEG (§142.7)", 256, 445);
    ctx.fillText("TOKEN TAX: 87,500 WORDS // 204 SECTIONS", 256, 472);

    return c;
  }

  function drawComplianceStampCanvas() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "rgba(32, 31, 28, 0.94)";
    ctx.fillRect(0, 0, 512, 256);

    // OSHA yellow/black hazard stripes top & bottom
    const drawHazardBar = (y) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, 512, 28);
      ctx.clip();
      ctx.fillStyle = "#d4a017";
      ctx.fillRect(0, y, 512, 28);
      ctx.fillStyle = "#1b1a17";
      for (let x = -40; x < 560; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, y + 28);
        ctx.lineTo(x + 18, y);
        ctx.lineTo(x + 36, y);
        ctx.lineTo(x + 18, y + 28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    drawHazardBar(0);
    drawHazardBar(228);

    ctx.strokeStyle = "#d4a017";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 248);

    ctx.fillStyle = "#f2c94c";
    ctx.textAlign = "center";
    ctx.font = "bold 24px monospace";
    ctx.fillText("NOTICE OF COMMITTEE COMPLIANCE", 256, 74);

    ctx.fillStyle = "#e0ddd5";
    ctx.font = "bold 17px monospace";
    ctx.fillText("§14.3 HANDRAILS  •  §88.2 SATURATION <= 14%", 256, 116);
    ctx.fillText("§119.6 4100K FLUORESCENT  •  §199.4 VELOCITY CAP", 256, 148);

    ctx.fillStyle = "#eb5757";
    ctx.font = "bold 19px monospace";
    ctx.fillText("APPROVED BY SUB-PANEL 7B (87,500 WORDS)", 256, 196);

    return c;
  }

  function createProceduralTextures(gl) {
    const facadeFronts = [];
    for (let i = 0; i < 6; i++) {
      facadeFronts.push(uploadCanvasTexture(gl, drawFacadeFrontCanvas(i), false));
    }
    const plywoodBack = uploadCanvasTexture(gl, drawPlywoodBackCanvas(), false);
    const complianceStamp = uploadCanvasTexture(gl, drawComplianceStampCanvas(), false);
    return { facadeFronts, plywoodBack, complianceStamp };
  }

  PE.MathGL = MathGL;
  PE.GLUtils = {
    createProgram,
    cacheUniforms,
    createPortalFBO,
    resizePortalFBO,
    createProceduralTextures
  };
})();
