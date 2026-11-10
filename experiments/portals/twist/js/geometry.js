// ============================================================================
// geometry.js — Procedural 3D Mesh Builder & 6 Sovereign World Generators
// Builds interleaved WebGL2 VAOs for:
//   0: Relativistic Stairwell (After M.C. Escher)
//   1: Armilla, City of Pipes (After Italo Calvino)
//   2: The Fractured Great Wave (After Katsushika Hokusai)
//   3: Lascaux Living Ochre Sanctuary (Paleolithic Fresco Reliefs)
//   4: Origami Astronomical Clockwork (Pop-Up Vellum Horology)
//   5: Hyperbolic Glass Scriptorium (Rayonnant Crystal & Mirror Sea)
// Plus §14.3–§199.4 Bureaucratic Compliance Props, §142.7 Potemkin Plywood
// Facades with 2x4 Struts, Recessed FBO Portal Meshes, and Quarantined Cyclone.
// ============================================================================
(function () {
  "use strict";
  const PE = (window.PortalEngine = window.PortalEngine || {});

  // Deterministic PRNG so worlds are 100% reproducible across sessions
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --------------------------------------------------------------------------
  // MeshBuilder: Accumulates 15-float interleaved vertices + Uint32 indices
  // [px,py,pz, nx,ny,nz, u,v, r,g,b, matType,animMode,animSeed,isBureaucracy]
  // --------------------------------------------------------------------------
  class MeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vertCount = 0;
    }

    pushVertex(px, py, pz, nx, ny, nz, u, v, col, meta) {
      this.verts.push(
        px, py, pz,
        nx, ny, nz,
        u, v,
        col[0], col[1], col[2],
        meta[0], meta[1], meta[2], meta[3]
      );
      return this.vertCount++;
    }

    addQuad(p0, p1, p2, p3, col, meta, uvScaleX = 1, uvScaleY = 1, customUV = null) {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const uvs = customUV || [
        [0, 0],
        [uvScaleX, 0],
        [uvScaleX, uvScaleY],
        [0, uvScaleY]
      ];

      const i0 = this.pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, uvs[0][0], uvs[0][1], col, meta);
      const i1 = this.pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, uvs[1][0], uvs[1][1], col, meta);
      const i2 = this.pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, uvs[2][0], uvs[2][1], col, meta);
      const i3 = this.pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, uvs[3][0], uvs[3][1], col, meta);
      this.indices.push(i0, i1, i2, i0, i2, i3);
    }

    addTri(p0, p1, p2, col, meta, customUV = null) {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const uvs = customUV || [[0, 0], [1, 0], [0.5, 1]];
      const i0 = this.pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, uvs[0][0], uvs[0][1], col, meta);
      const i1 = this.pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, uvs[1][0], uvs[1][1], col, meta);
      const i2 = this.pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, uvs[2][0], uvs[2][1], col, meta);
      this.indices.push(i0, i1, i2);
    }

    // Axis-aligned or rotated box centered at (cx, cy, cz) with full sizes (sx, sy, sz)
    addBox(cx, cy, cz, sx, sy, sz, col, meta, rotZ = 0, rotY = 0, rotX = 0) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const czr = Math.cos(rotZ), szr = Math.sin(rotZ);
      const cyr = Math.cos(rotY), syr = Math.sin(rotY);
      const cxr = Math.cos(rotX), sxr = Math.sin(rotX);

      const xf = (x, y, z) => {
        // X rot
        let y1 = y * cxr - z * sxr;
        let z1 = y * sxr + z * cxr;
        let x1 = x;
        // Z rot
        let x2 = x1 * czr - y1 * szr;
        let y2 = x1 * szr + y1 * czr;
        let z2 = z1;
        // Y rot
        let x3 = x2 * cyr + z2 * syr;
        let z3 = -x2 * syr + z2 * cyr;
        return [cx + x3, cy + y2, cz + z3];
      };

      const c000 = xf(-hx, -hy, -hz), c100 = xf(hx, -hy, -hz);
      const c110 = xf(hx, hy, -hz),  c010 = xf(-hx, hy, -hz);
      const c001 = xf(-hx, -hy, hz),  c101 = xf(hx, -hy, hz);
      const c111 = xf(hx, hy, hz),   c011 = xf(-hx, hy, hz);

      this.addQuad(c001, c101, c111, c011, col, meta, sx, sy); // +Z
      this.addQuad(c100, c000, c010, c110, col, meta, sx, sy); // -Z
      this.addQuad(c101, c100, c110, c111, col, meta, sz, sy); // +X
      this.addQuad(c000, c001, c011, c010, col, meta, sz, sy); // -X
      this.addQuad(c011, c111, c110, c010, col, meta, sx, sz); // +Y
      this.addQuad(c000, c100, c101, c001, col, meta, sx, sz); // -Y
    }

    // Cylinder / Tube between arbitrary 3D endpoints A and B
    addCylinderBetween(a, b, r0, r1, segs, col, meta, capEnds = true) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-5) return;
      const tx = dx / len, ty = dy / len, tz = dz / len;

      // Orthogonal basis around tangent t
      let ux = Math.abs(ty) < 0.9 ? 0 : 1;
      let uy = Math.abs(ty) < 0.9 ? 1 : 0;
      let uz = 0;
      // n1 = normalize(cross(u, t))
      let n1x = uy * tz - uz * ty;
      let n1y = uz * tx - ux * tz;
      let n1z = ux * ty - uy * tx;
      const n1l = Math.hypot(n1x, n1y, n1z) || 1;
      n1x /= n1l; n1y /= n1l; n1z /= n1l;
      // n2 = cross(t, n1)
      const n2x = ty * n1z - tz * n1y;
      const n2y = tz * n1x - tx * n1z;
      const n2z = tx * n1y - ty * n1x;

      const ring0 = [];
      const ring1 = [];
      for (let i = 0; i <= segs; i++) {
        const ang = (i / segs) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const nx = n1x * ca + n2x * sa;
        const ny = n1y * ca + n2y * sa;
        const nz = n1z * ca + n2z * sa;
        const u = i / segs;
        ring0.push(
          this.pushVertex(
            a[0] + nx * r0, a[1] + ny * r0, a[2] + nz * r0,
            nx, ny, nz, u, 0, col, meta
          )
        );
        ring1.push(
          this.pushVertex(
            b[0] + nx * r1, b[1] + ny * r1, b[2] + nz * r1,
            nx, ny, nz, u, len, col, meta
          )
        );
      }
      for (let i = 0; i < segs; i++) {
        this.indices.push(ring0[i], ring0[i + 1], ring1[i + 1], ring0[i], ring1[i + 1], ring1[i]);
      }

      if (capEnds && r0 > 0.01) {
        const c0 = this.pushVertex(a[0], a[1], a[2], -tx, -ty, -tz, 0.5, 0.5, col, meta);
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2;
          const a1 = ((i + 1) / segs) * Math.PI * 2;
          const v0 = this.pushVertex(
            a[0] + (n1x * Math.cos(a0) + n2x * Math.sin(a0)) * r0,
            a[1] + (n1y * Math.cos(a0) + n2y * Math.sin(a0)) * r0,
            a[2] + (n1z * Math.cos(a0) + n2z * Math.sin(a0)) * r0,
            -tx, -ty, -tz, 0, 0, col, meta
          );
          const v1 = this.pushVertex(
            a[0] + (n1x * Math.cos(a1) + n2x * Math.sin(a1)) * r0,
            a[1] + (n1y * Math.cos(a1) + n2y * Math.sin(a1)) * r0,
            a[2] + (n1z * Math.cos(a1) + n2z * Math.sin(a1)) * r0,
            -tx, -ty, -tz, 1, 0, col, meta
          );
          this.indices.push(c0, v1, v0);
        }
      }
      if (capEnds && r1 > 0.01) {
        const c1 = this.pushVertex(b[0], b[1], b[2], tx, ty, tz, 0.5, 0.5, col, meta);
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2;
          const a1 = ((i + 1) / segs) * Math.PI * 2;
          const v0 = this.pushVertex(
            b[0] + (n1x * Math.cos(a0) + n2x * Math.sin(a0)) * r1,
            b[1] + (n1y * Math.cos(a0) + n2y * Math.sin(a0)) * r1,
            b[2] + (n1z * Math.cos(a0) + n2z * Math.sin(a0)) * r1,
            tx, ty, tz, 0, 1, col, meta
          );
          const v1 = this.pushVertex(
            b[0] + (n1x * Math.cos(a1) + n2x * Math.sin(a1)) * r1,
            b[1] + (n1y * Math.cos(a1) + n2y * Math.sin(a1)) * r1,
            b[2] + (n1z * Math.cos(a1) + n2z * Math.sin(a1)) * r1,
            tx, ty, tz, 1, 1, col, meta
          );
          this.indices.push(c1, v0, v1);
        }
      }
    }

    // Staircase flight along an arbitrary origin, forward dir, and local 'up' gravity dir
    addStairFlight(origin, fwdDir, upDir, width, steps, stepRun, stepRise, col, meta) {
      // right = cross(fwd, up)
      const rx = fwdDir[1] * upDir[2] - fwdDir[2] * upDir[1];
      const ry = fwdDir[2] * upDir[0] - fwdDir[0] * upDir[2];
      const rz = fwdDir[0] * upDir[1] - fwdDir[1] * upDir[0];
      const hw = width * 0.5;

      for (let s = 0; s < steps; s++) {
        const r0 = s * stepRun;
        const r1 = (s + 1) * stepRun;
        const h0 = -stepRise * 0.8;
        const h1 = (s + 1) * stepRise;

        const pt = (r, h, wOff) => [
          origin[0] + fwdDir[0] * r + upDir[0] * h + rx * wOff,
          origin[1] + fwdDir[1] * r + upDir[1] * h + ry * wOff,
          origin[2] + fwdDir[2] * r + upDir[2] * h + rz * wOff
        ];

        const bl0 = pt(r0, Math.max(0, s * stepRise - stepRise * 1.4), -hw);
        const br0 = pt(r0, Math.max(0, s * stepRise - stepRise * 1.4), hw);
        const tl0 = pt(r0, h1, -hw);
        const tr0 = pt(r0, h1, hw);
        const tl1 = pt(r1, h1, -hw);
        const tr1 = pt(r1, h1, hw);
        const bl1 = pt(r1, Math.max(0, s * stepRise - stepRise * 0.4), -hw);
        const br1 = pt(r1, Math.max(0, s * stepRise - stepRise * 0.4), hw);
        void h0;

        // Riser, tread, left & right cheeks, underside
        this.addQuad(bl0, br0, tr0, tl0, col, meta, width, stepRise);
        this.addQuad(tl0, tr0, tr1, tl1, col, meta, width, stepRun);
        this.addQuad(bl0, tl0, tl1, bl1, col, meta, stepRun, stepRise * 2);
        this.addQuad(br1, tr1, tr0, br0, col, meta, stepRun, stepRise * 2);
        this.addQuad(bl1, br1, br0, bl0, col, meta, width, stepRun);
      }
    }

    // Octahedron / Stellated polyhedron
    addOctahedron(cx, cy, cz, radius, col, meta) {
      const top = [cx, cy + radius, cz];
      const bot = [cx, cy - radius, cz];
      const pts = [
        [cx + radius, cy, cz],
        [cx, cy, cz - radius],
        [cx - radius, cy, cz],
        [cx, cy, cz + radius]
      ];
      for (let i = 0; i < 4; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % 4];
        this.addTri(top, p0, p1, col, meta);
        this.addTri(bot, p1, p0, col, meta);
      }
    }

    // Folded Origami Involute Gear in XY plane at (cx, cy, cz), spinning around (cx, cy) via UV!
    addOrigamiGear(cx, cy, cz, innerR, outerR, teeth, thickness, colMain, colTrim, matType, speed, animMode = 2.0) {
      const meta = [matType, animMode, speed, 0.0];
      const metaTrim = [1.0, animMode, speed, 0.0];
      const uvCenter = [[cx, cy], [cx, cy], [cx, cy], [cx, cy]];
      const uvTri = [[cx, cy], [cx, cy], [cx, cy]];

      const segs = teeth * 2;
      const hz = thickness * 0.5;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const am = (a0 + a1) * 0.5;
        const r0 = i % 2 === 0 ? outerR : innerR;
        const r1 = i % 2 === 0 ? innerR : outerR;

        const x0 = cx + Math.cos(a0) * r0, y0 = cy + Math.sin(a0) * r0;
        const x1 = cx + Math.cos(a1) * r1, y1 = cy + Math.sin(a1) * r1;
        const xi0 = cx + Math.cos(a0) * innerR * 0.42, yi0 = cy + Math.sin(a0) * innerR * 0.42;
        const xi1 = cx + Math.cos(a1) * innerR * 0.42, yi1 = cy + Math.sin(a1) * innerR * 0.42;
        // Origami mountain-fold ridge in middle of each tooth
        const xm = cx + Math.cos(am) * ((r0 + r1) * 0.52), ym = cy + Math.sin(am) * ((r0 + r1) * 0.52);

        // Front pleated facets (+Z)
        this.addTri([xi0, yi0, cz + hz * 0.6], [x0, y0, cz + hz * 0.3], [xm, ym, cz + hz * 1.35], colMain, meta, uvTri);
        this.addTri([xi0, yi0, cz + hz * 0.6], [xm, ym, cz + hz * 1.35], [xi1, yi1, cz + hz * 0.6], colMain, meta, uvTri);
        this.addTri([xi1, yi1, cz + hz * 0.6], [xm, ym, cz + hz * 1.35], [x1, y1, cz + hz * 0.3], colMain, meta, uvTri);

        // Back pleated facets (-Z)
        this.addTri([xi0, yi0, cz - hz * 0.6], [xm, ym, cz - hz * 1.35], [x0, y0, cz - hz * 0.3], colMain, meta, uvTri);
        this.addTri([xi0, yi0, cz - hz * 0.6], [xi1, yi1, cz - hz * 0.6], [xm, ym, cz - hz * 1.35], colMain, meta, uvTri);
        this.addTri([xi1, yi1, cz - hz * 0.6], [x1, y1, cz - hz * 0.3], [xm, ym, cz - hz * 1.35], colMain, meta, uvTri);

        // Outer rim ribbon
        this.addQuad(
          [x0, y0, cz - hz * 0.3], [x1, y1, cz - hz * 0.3],
          [x1, y1, cz + hz * 0.3], [x0, y0, cz + hz * 0.3],
          colTrim, metaTrim, 1, 1, uvCenter
        );
      }
    }

    uploadToGPU(gl) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.STATIC_DRAW);

      const ebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices), gl.STATIC_DRAW);

      const stride = 15 * 4;
      // 0: aPosition (3)
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      // 1: aNormal (3)
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
      // 2: aUV (2)
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 6 * 4);
      // 3: aColor (3)
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 8 * 4);
      // 4: aMeta (4)
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 11 * 4);

      gl.bindVertexArray(null);
      return {
        vao,
        vbo,
        ebo,
        indexCount: this.indices.length,
        vertexCount: this.vertCount
      };
    }
  }

  // --------------------------------------------------------------------------
  // Shared Portal Frame & §142.7 Bureaucracy Props Builder
  // --------------------------------------------------------------------------
  function addPortalArchwayFrame(mb, zPos, colStone, colGlow, matStone) {
    // Opening: x in [-3.1, +3.1], y in [0.0, 6.6]
    const metaFrame = [matStone, 0, 0, 0];
    const metaGlow = [1.0, 0, 1.5, 0];

    // Left & right monumental piers
    mb.addBox(-3.65, 3.55, zPos, 1.1, 7.1, 1.1, colStone, metaFrame);
    mb.addBox(3.65, 3.55, zPos, 1.1, 7.1, 1.1, colStone, metaFrame);
    // Plinth bases
    mb.addBox(-3.65, 0.35, zPos, 1.45, 0.7, 1.45, colStone, metaFrame);
    mb.addBox(3.65, 0.35, zPos, 1.45, 0.7, 1.45, colStone, metaFrame);
    // Lintel & stepped entablature
    mb.addBox(0.0, 7.05, zPos, 8.6, 0.9, 1.25, colStone, metaFrame);
    mb.addBox(0.0, 7.72, zPos, 9.2, 0.45, 1.5, colStone, metaFrame);

    // Inner glowing energy trim around opening
    mb.addBox(-3.16, 3.3, zPos, 0.14, 6.6, 0.36, colGlow, metaGlow);
    mb.addBox(3.16, 3.3, zPos, 0.14, 6.6, 0.36, colGlow, metaGlow);
    mb.addBox(0.0, 6.64, zPos, 6.46, 0.14, 0.36, colGlow, metaGlow);
    mb.addBox(0.0, 0.04, zPos, 6.46, 0.08, 0.42, colGlow, metaGlow);
  }

  // Builds the dynamic §142.7 Potemkin Plywood Facade + 2x4 Struts VAO per world
  // so rigid-body sphere impacts physically jolt/tilt the billboard on its hinge!
  function buildHingedBillboardForWorld(gl, worldIndex) {
    const mb = new MeshBuilder();
    const colPine = [0.74, 0.58, 0.36];
    const colSandbag = [0.46, 0.43, 0.35];
    const metaWood = [13.0, 0, 0, 1.0];
    const metaFront = [11.0, 0, worldIndex, 1.0];
    const metaBack = [12.0, 0, 0, 1.0];

    const fx = 1.85, fy = 2.50, fz = 6.20;
    const fw = 2.25, fh = 2.25;
    mb.addQuad(
      [fx - fw, fy - fh, fz + 0.04],
      [fx + fw, fy - fh, fz + 0.04],
      [fx + fw, fy + fh, fz + 0.04],
      [fx - fw, fy + fh, fz + 0.04],
      [1, 1, 1], metaFront, 1, 1
    );
    mb.addQuad(
      [fx + fw, fy - fh, fz - 0.04],
      [fx - fw, fy - fh, fz - 0.04],
      [fx - fw, fy + fh, fz - 0.04],
      [fx + fw, fy + fh, fz - 0.04],
      [1, 1, 1], metaBack, 1, 1
    );
    mb.addBox(fx, fy + fh, fz, fw * 2, 0.05, 0.08, colPine, metaWood);
    mb.addBox(fx - fw, fy, fz, 0.05, fh * 2, 0.08, colPine, metaWood);
    mb.addBox(fx + fw, fy, fz, 0.05, fh * 2, 0.08, colPine, metaWood);

    for (const sx of [fx - 1.65, fx, fx + 1.65]) {
      mb.addBox(sx, fy, fz - 0.10, 0.11, 4.4, 0.11, colPine, metaWood);
      mb.addBox(sx, 0.10, fz - 1.65, 0.12, 0.10, 3.2, colPine, metaWood);
      mb.addCylinderBetween(
        [sx, fy + 1.55, fz - 0.12],
        [sx, 0.14, fz - 3.05],
        0.065, 0.065, 6, colPine, metaWood, true
      );
      mb.addCylinderBetween(
        [sx, 1.35, fz - 0.12],
        [sx, 1.35, fz - 1.75],
        0.05, 0.05, 6, colPine, metaWood, true
      );
      mb.addBox(sx, 0.24, fz - 2.75, 0.56, 0.24, 0.42, colSandbag, metaWood, 0, 0.18);
      mb.addBox(sx, 0.44, fz - 2.70, 0.50, 0.20, 0.38, colSandbag, metaWood, 0, -0.14);
    }
    return mb.uploadToGPU(gl);
  }

  // Static compliance layer (fluorescent troffers, OSHA handrails, placards, cages)
  function addBureaucracyLayer(mb, worldIndex) {
    const colYellow = [0.85, 0.65, 0.10];
    const colGrey = [0.54, 0.53, 0.49];
    const colFluor = [0.92, 0.95, 0.96];

    const metaOSHA = [14.0, 0, 0, 1.0];
    const metaStamp = [15.0, 0, 0, 1.0];
    const metaFluor = [1.0, 0, 0, 1.0];

    // Tripod #1 floor marker pad at (1.85, 0.03, 10.2) so Free-Roam explorers can spot the Judge's rig!
    mb.addBox(1.85, 0.04, 10.2, 1.1, 0.06, 1.1, colYellow, metaOSHA);

    // 2. §119.6 Flicker-Free 4100K Office Fluorescent Drop-Ceiling Troffers overhead
    for (let z = -14; z <= 14; z += 7) {
      mb.addBox(-2.2, 8.3, z, 2.4, 0.14, 1.2, colGrey, metaOSHA);
      mb.addBox(-2.2, 8.21, z, 2.1, 0.04, 0.95, colFluor, metaFluor);
      mb.addBox(2.2, 8.3, z, 2.4, 0.14, 1.2, colGrey, metaOSHA);
      mb.addBox(2.2, 8.21, z, 2.1, 0.04, 0.95, colFluor, metaFluor);
    }

    // 3. §14.3 Mandatory Safety-Yellow OSHA Tubular Handrails flanking corridor & upside-down ceiling!
    const addOSHARun = (xPos, yBase, zStart, zEnd, invert = false) => {
      const dir = invert ? -1 : 1;
      const yTop = yBase + dir * 1.08;
      const yMid = yBase + dir * 0.56;
      const yToe = yBase + dir * 0.10;
      mb.addCylinderBetween([xPos, yTop, zStart], [xPos, yTop, zEnd], 0.045, 0.045, 8, colYellow, metaOSHA, true);
      mb.addCylinderBetween([xPos, yMid, zStart], [xPos, yMid, zEnd], 0.035, 0.035, 8, colYellow, metaOSHA, true);
      mb.addBox(xPos, yToe, (zStart + zEnd) * 0.5, 0.05, 0.18, Math.abs(zEnd - zStart), colYellow, metaOSHA);
      const steps = Math.max(2, Math.floor(Math.abs(zEnd - zStart) / 3.5));
      for (let i = 0; i <= steps; i++) {
        const zz = zStart + ((zEnd - zStart) * i) / steps;
        mb.addCylinderBetween([xPos, yBase, zz], [xPos, yTop, zz], 0.045, 0.045, 8, colYellow, metaOSHA, true);
      }
    };
    addOSHARun(-3.45, 0.0, -15.5, 15.5, false);
    addOSHARun(3.45, 0.0, -15.5, 3.0, false);
    // Absurd §14.3 upside-down OSHA handrails bolted to the ceiling!
    addOSHARun(-2.8, 8.1, -13.0, 11.0, true);
    addOSHARun(2.8, 8.1, -13.0, 11.0, true);

    // 4. Floating "APPROVED BY SUB-PANEL 7B" Compliance Placards
    const addPlacard = (px, py, pz, ry) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      const hw = 1.55, hh = 0.78;
      // Offset front (+normal) and back (-normal) by 3cm so LEQUAL never Z-fights!
      const nx = s * 0.03, nz = c * 0.03;
      const f0 = [px - hw * c + nx, py - hh, pz + hw * s + nz];
      const f1 = [px + hw * c + nx, py - hh, pz - hw * s + nz];
      const f2 = [px + hw * c + nx, py + hh, pz - hw * s + nz];
      const f3 = [px - hw * c + nx, py + hh, pz + hw * s + nz];
      const b0 = [px + hw * c - nx, py - hh, pz - hw * s - nz];
      const b1 = [px - hw * c - nx, py - hh, pz + hw * s - nz];
      const b2 = [px - hw * c - nx, py + hh, pz + hw * s - nz];
      const b3 = [px + hw * c - nx, py + hh, pz - hw * s - nz];
      mb.addQuad(f0, f1, f2, f3, [1, 1, 1], metaStamp, 1, 1);
      mb.addQuad(b0, b1, b2, b3, [1, 1, 1], metaStamp, 1, 1);
    };
    addPlacard(-2.6, 4.3, -4.5, 0.28);
    addPlacard(2.5, 4.5, -10.5, -0.32);

    // 5. World-specific bureaucratic vandalism (§47.9 drywall soffits, §199.4 gear cages)
    if (worldIndex === 1) {
      // Box in Armilla's gossamer sky-pipes with ugly municipal grey drywall bulkheads
      for (let z = -13; z <= 13; z += 6.5) {
        mb.addBox(-5.2, 4.5, z, 1.7, 9.0, 1.7, colGrey, metaOSHA);
        mb.addBox(5.2, 4.5, z, 1.7, 9.0, 1.7, colGrey, metaOSHA);
      }
    } else if (worldIndex === 4) {
      // Clumsy yellow pinch-point safety cages over Origami clockwork gears
      for (const [gx, gy, gz] of [[-5.2, 4.2, -5.0], [5.4, 4.5, -8.5]]) {
        for (let k = -3; k <= 3; k++) {
          mb.addBox(gx + k * 0.65, gy, gz + 0.55, 0.08, 4.6, 0.08, colYellow, metaOSHA);
          mb.addBox(gx, gy + k * 0.65, gz + 0.55, 4.6, 0.08, 0.08, colYellow, metaOSHA);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // WORLD 0: Relativistic Stairwell (After M.C. Escher)
  // --------------------------------------------------------------------------
  function buildWorld0_Escher(gl) {
    const mb = new MeshBuilder();
    const ivory = [0.91, 0.88, 0.81];
    const stoneMid = [0.68, 0.64, 0.58];
    const charcoal = [0.27, 0.25, 0.22];
    const amber = [0.95, 0.72, 0.34];

    const metaStone = [0.0, 0, 0, 0];
    const metaLantern = [1.0, 0, 0, 0];

    // Central promenade floor & inverted ceiling promenade (mirror gravity!)
    mb.addBox(0, -0.25, 0, 8.2, 0.5, 42.0, ivory, metaStone);
    mb.addBox(0, 9.6, 0, 8.2, 0.5, 42.0, stoneMid, metaStone);

    // Sideways gravity walls with recessed arched colonnades
    for (let z = -15; z <= 15; z += 5.0) {
      // Left & right monumental Escher piers
      mb.addBox(-6.8, 4.6, z, 1.4, 10.8, 1.4, ivory, metaStone);
      mb.addBox(6.8, 4.6, z, 1.4, 10.8, 1.4, ivory, metaStone);
      // Cross-lintels connecting piers
      mb.addBox(-6.8, 9.2, z + 2.5, 1.2, 1.1, 3.8, stoneMid, metaStone);
      mb.addBox(6.8, 9.2, z + 2.5, 1.2, 1.1, 3.8, stoneMid, metaStone);

      // Multi-gravity lanterns (normal, upside-down, and sideways wall lanterns!)
      mb.addBox(-4.2, 1.3, z, 0.38, 0.65, 0.38, amber, metaLantern);
      mb.addBox(4.2, 8.1, z, 0.38, 0.65, 0.38, amber, metaLantern);
      mb.addBox(-6.0, 4.6, z + 2.5, 0.65, 0.38, 0.38, amber, metaLantern);
      mb.addBox(6.0, 4.6, z + 2.5, 0.65, 0.38, 0.38, amber, metaLantern);
    }

    // 1. Ascending normal-gravity lateral stair flights
    mb.addStairFlight([-5.2, 0.0, 12.0], [0, 0, -1], [0, 1, 0], 1.8, 14, 0.55, 0.32, ivory, metaStone);
    mb.addStairFlight([5.2, 0.0, 4.0], [0, 0, -1], [0, 1, 0], 1.8, 14, 0.55, 0.32, ivory, metaStone);

    // 2. UPSIDE-DOWN ceiling stair flights (local gravity = [0, -1, 0]!)
    mb.addStairFlight([-2.4, 9.35, 10.0], [0, 0, -1], [0, -1, 0], 1.9, 12, 0.58, 0.28, stoneMid, metaStone);
    mb.addStairFlight([2.4, 9.35, -3.0], [0, 0, -1], [0, -1, 0], 1.9, 12, 0.58, 0.28, stoneMid, metaStone);

    // 3. SIDEWAYS wall-gravity stair flights (local gravity = [+1, 0, 0] and [-1, 0, 0]!)
    mb.addStairFlight([-6.1, 2.6, 8.0], [0, 0, -1], [1, 0, 0], 1.7, 11, 0.55, 0.24, ivory, metaStone);
    mb.addStairFlight([6.1, 6.4, -2.0], [0, 0, -1], [-1, 0, 0], 1.7, 11, 0.55, 0.24, ivory, metaStone);

    // 4. Impossible diagonal cross-bridges spanning high above the central vista
    mb.addStairFlight([-5.0, 5.1, 1.5], [1, 0, 0], [0, 1, 0], 1.6, 10, 0.52, 0.22, charcoal, metaStone);
    mb.addStairFlight([5.0, 7.3, -9.5], [-1, 0, 0], [0, -1, 0], 1.6, 10, 0.52, 0.22, ivory, metaStone);

    // Note: Asymmetric floating Escherian polyhedra are dynamically rendered via
    // RK4 Torque-Free Euler Precession (I·ω̇ + ω×Iω = 0) in physics.js!

    addPortalArchwayFrame(mb, -18.0, charcoal, amber, 0.0);
    addPortalArchwayFrame(mb, 18.0, charcoal, amber, 0.0);
    addBureaucracyLayer(mb, 0);

    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // WORLD 1: Armilla, City of Pipes (After Italo Calvino)
  // --------------------------------------------------------------------------
  function buildWorld1_Armilla(gl) {
    const mb = new MeshBuilder();
    const rand = mulberry32(1972);
    const copper = [0.84, 0.52, 0.27];
    const brass = [0.90, 0.71, 0.32];
    const verdigris = [0.30, 0.63, 0.52];
    const porcelain = [0.95, 0.97, 0.99];
    const waterCol = [0.62, 0.88, 1.00];

    const metaMetal = [2.0, 0, 0, 0];
    const metaPorcelain = [4.0, 0, 0, 0];

    // Delicate open-sky filigree grate walkway (no solid walls or ceilings!)
    for (let z = -17.5; z <= 17.5; z += 1.25) {
      mb.addCylinderBetween([-2.8, 0.0, z], [2.8, 0.0, z], 0.045, 0.045, 6, brass, metaMetal, false);
    }
    for (const x of [-2.8, -1.4, 0.0, 1.4, 2.8]) {
      mb.addCylinderBetween([x, -0.05, -18.5], [x, -0.05, 18.5], 0.07, 0.07, 8, copper, metaMetal, false);
    }

    // Forest of vertical copper/verdigris risers rising from below the clouds into open sky
    const pipeColumns = [
      [-5.2, -14], [-7.8, -11], [-4.6, -7], [-8.5, -3], [-5.4, 2], [-7.2, 7], [-4.8, 12], [-8.0, 15],
      [5.2, -14],  [7.8, -11],  [4.6, -7],  [8.5, -3],  [5.4, 2],  [7.2, 7],  [4.8, 12],  [8.0, 15]
    ];

    pipeColumns.forEach(([px, pz], idx) => {
      const col = idx % 3 === 0 ? verdigris : idx % 2 === 0 ? copper : brass;
      const rad = 0.11 + (idx % 3) * 0.04;
      mb.addCylinderBetween([px, -12.0, pz], [px, 18.0, pz], rad, rad, 10, col, metaMetal, false);
      mb.addCylinderBetween([px + 0.45, -10.0, pz + 0.3], [px + 0.45, 16.0, pz + 0.3], 0.055, 0.055, 8, brass, metaMetal, false);

      // Horizontal phantom-floor aqueduct branches overhead & below
      const yFloor = 3.8 + (idx % 4) * 2.1;
      mb.addCylinderBetween([px, yFloor, pz], [-px, yFloor, pz], 0.065, 0.065, 8, copper, metaMetal, false);

      // Spoked brass valve wheels coupled to Bernoulli volumetric flow rate!
      const vy = 2.2 + (idx % 3) * 1.9;
      const speed = (idx % 2 === 0 ? 0.85 : -0.72);
      mb.addOrigamiGear(px, vy, pz + rad + 0.08, 0.52, 0.62, 8, 0.08, brass, verdigris, 2.0, speed, 2.0);

      // Suspended white porcelain basins fed by Torricelli horizontal efflux spigots!
      if (idx % 2 === 0) {
        const bx = px * 0.68;
        const by = 2.8 + (idx % 3) * 1.8;
        const signX = px < 0 ? 1 : -1;
        // Basin cradle & porcelain tub + pooling water surface inside tub
        mb.addBox(bx, by, pz, 1.65, 0.52, 0.96, porcelain, metaPorcelain);
        mb.addBox(bx, by + 0.30, pz, 1.80, 0.12, 1.08, porcelain, metaPorcelain);
        mb.addBox(bx, by + 0.24, pz, 1.54, 0.04, 0.86, waterCol, [3.0, 0, rand() * 6.28, 0]);
        // Torricelli brass orifice spigot mounted higher on standpipe at (px, by + 1.55, pz) aiming inward!
        mb.addCylinderBetween([px, by + 1.55, pz], [px + signX * 0.42, by + 1.50, pz], 0.065, 0.045, 8, brass, metaMetal, true);
        // Overflow drain stream falling into the clouds below
        const wMeta = [3.0, 4.0, rand() * 6.28, 0];
        mb.addCylinderBetween([bx + signX * 0.55, by - 0.25, pz], [bx + signX * 0.55, -11.0, pz], 0.042, 0.016, 8, waterCol, wMeta, false);
      }
    });

    addPortalArchwayFrame(mb, -18.0, copper, waterCol, 2.0);
    addPortalArchwayFrame(mb, 18.0, copper, waterCol, 2.0);
    addBureaucracyLayer(mb, 1);

    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // WORLD 2: The Fractured Great Wave (After Katsushika Hokusai)
  // --------------------------------------------------------------------------
  function buildWorld2_Hokusai(gl) {
    const mb = new MeshBuilder();
    const prussian = [0.07, 0.21, 0.38];
    const indigo = [0.16, 0.39, 0.62];
    const foam = [0.96, 0.94, 0.88];
    const vermilion = [0.80, 0.29, 0.19];

    // Finely tessellated Gerstner deep-water dispersion sea grid (animMode = 7.0!)
    const dx = 1.25, dz = 1.25;
    for (let z = -19.0; z < 19.0; z += dz) {
      for (let x = -11.25; x < 11.25; x += dx) {
        const h0 = Math.abs(x) * 0.07 - 0.25;
        const h1 = Math.abs(x + dx) * 0.07 - 0.25;
        const c = Math.abs(x) < 3.4 ? prussian : indigo;
        mb.addQuad(
          [x, h0, z + dz], [x + dx, h1, z + dz],
          [x + dx, h1, z], [x, h0, z],
          c, [5.0, 7.0, 0.0, 0], 1, 1
        );
      }
    }

    // Monumental curling Great Wave ribs arching overhead from left & right!
    for (let i = 0; i < 14; i++) {
      const z = -15.5 + i * 2.4;
      const side = i % 3 === 1 ? 1 : -1;
      const scale = side < 0 ? 1.15 : 0.88;
      const segs = 12;
      const ribMeta = [5.0, 3.0, i * 0.45, 0];
      const clawMeta = [6.0, 3.0, i * 0.45 + 0.2, 0];

      let prevPt = [side * 9.4, -0.3, z];
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const ang = t * Math.PI * 1.12;
        const rad = (7.2 - t * 3.0) * scale;
        const wx = side * (4.85 + Math.cos(ang) * rad * 0.62);
        const wy = 0.35 + Math.sin(ang) * rad * 1.15;
        const wz = z + Math.sin(t * 3.14) * 0.45;
        const curPt = [wx, wy, wz];
        const col = t > 0.78 ? indigo : prussian;
        const r0 = (0.68 - t * 0.44) * scale;
        const r1 = (0.64 - t * 0.46) * scale;
        mb.addCylinderBetween(prevPt, curPt, Math.max(0.08, r0), Math.max(0.06, r1), 7, col, ribMeta, false);
        prevPt = curPt;

        if (s >= 9) {
          for (const spread of [-0.38, 0.0, 0.38]) {
            const tip = [
              wx - side * (0.75 + (s - 8) * 0.22),
              wy - 0.55 - Math.abs(spread) * 0.3,
              wz + spread
            ];
            mb.addCylinderBetween(curPt, tip, 0.16, 0.02, 5, foam, clawMeta, true);
          }
        }
      }
    }

    // Note: Edo cedar oshiokuri-bune skiffs are dynamically simulated via
    // Archimedes Submerged-Cap Buoyancy + Gerstner Wave-Slope Torque in physics.js!

    // Distant snow-capped Mount Fuji cone framed beyond the horizon!
    mb.addCylinderBetween([-14.0, -1.0, -34.0], [-14.0, 9.2, -34.0], 13.5, 3.2, 16, prussian, [5.0, 0, 0, 0], false);
    mb.addCylinderBetween([-14.0, 6.2, -34.0], [-14.0, 9.8, -34.0], 5.6, 1.4, 16, foam, [6.0, 0, 0, 0], true);

    addPortalArchwayFrame(mb, -18.0, prussian, vermilion, 5.0);
    addPortalArchwayFrame(mb, 18.0, prussian, vermilion, 5.0);
    addBureaucracyLayer(mb, 2);

    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // WORLD 3: Lascaux Living Ochre Sanctuary
  // --------------------------------------------------------------------------
  function buildWorld3_Lascaux(gl) {
    const mb = new MeshBuilder();
    const rand = mulberry32(17000);
    const limestone = [0.84, 0.73, 0.58];
    const darkRock = [0.42, 0.34, 0.27];
    const redOchre = [0.74, 0.28, 0.13];
    const yellowOchre = [0.87, 0.56, 0.18];
    const charcoal = [0.13, 0.10, 0.08];
    const flame = [1.00, 0.65, 0.18];

    const metaCave = [7.0, 0, 0, 0];

    // Undulating subterranean Paleolithic cavern tunnel (arched segments from z=-18.5 to +18.5)
    const zSteps = 26;
    const arcSteps = 14;
    const cavePt = (iz, ia) => {
      const z = -18.5 + (iz / zSteps) * 37.0;
      const t = ia / arcSteps; // 0 = left floor, 0.5 = ceiling crown, 1 = right floor
      const ang = Math.PI * (1.0 - t);
      const undulate =
        Math.sin(z * 0.28 + t * 4.2) * 0.55 +
        Math.cos(z * 0.61 - t * 6.0) * 0.28;
      const rx = 6.8 + undulate;
      const ry = 7.8 + Math.sin(z * 0.35) * 0.45;
      const x = Math.cos(ang) * rx;
      const y = Math.max(-0.1, Math.sin(ang) * ry);
      return [x, y, z];
    };

    for (let iz = 0; iz < zSteps; iz++) {
      for (let ia = 0; ia < arcSteps; ia++) {
        const p00 = cavePt(iz, ia);
        const p10 = cavePt(iz + 1, ia);
        const p11 = cavePt(iz + 1, ia + 1);
        const p01 = cavePt(iz, ia + 1);
        const col = (ia > 2 && ia < 12) ? limestone : darkRock;
        // Inward-facing cavern quads
        mb.addQuad(p00, p10, p11, p01, col, metaCave, 1, 1);
      }
    }

    // Cavern stone floor path
    mb.addBox(0, -0.22, 0, 14.0, 0.45, 39.0, darkRock, metaCave);

    // Stalactites & stalagmites along the cavern flanks
    for (let i = 0; i < 28; i++) {
      const z = -16.0 + rand() * 32.0;
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (4.3 + rand() * 1.9);
      const len = 1.4 + rand() * 2.3;
      mb.addCylinderBetween([x, 7.6, z], [x, 7.6 - len, z], 0.34, 0.03, 7, limestone, metaCave, true);
      if (i % 2 === 0) {
        mb.addCylinderBetween([x * 1.05, 0.0, z + 0.6], [x * 1.05, 0.9 + rand() * 1.2, z + 0.6], 0.32, 0.05, 7, darkRock, metaCave, true);
      }
    }

    // Flickering Paleolithic stone hearth cairns & tallow torches
    for (const [tx, tz, seed] of [
      [-3.4, 9.0, 0.4], [3.4, 3.0, 1.9], [-3.4, -4.5, 3.3], [3.4, -11.5, 4.8]
    ]) {
      mb.addCylinderBetween([tx, 0.0, tz], [tx, 1.25, tz], 0.48, 0.32, 8, darkRock, metaCave, true);
      mb.addOctahedron(tx, 1.58, tz, 0.32, flame, [1.0, 5.0, seed, 0]);
    }

    // Layered Parallaxing Megafauna Bas-Relief Frescoes (Aurochs Bulls, Megaloceros Stags, Horses!)
    const addAnimalRelief = (cx, cy, cz, side, colBody, scale, seed, isStag) => {
      const inward = -side; // +1 on left wall, -1 on right wall
      const mBody = [7.0, 5.0, seed, 0];
      const mLine = [7.0, 5.0, seed + 0.3, 0];
      // Sculpted torso slab standing proud of rock wall for genuine torchlight parallax!
      mb.addBox(cx, cy, cz, 0.18, 0.95 * scale, 2.35 * scale, colBody, mBody, 0, inward * 0.08);
      // Charcoal dorsal contour & shoulder hump
      mb.addBox(cx + inward * 0.07, cy + 0.48 * scale, cz - 0.35 * scale, 0.14, 0.28 * scale, 1.65 * scale, charcoal, mLine);
      // Head & muzzle
      mb.addBox(cx + inward * 0.10, cy + 0.38 * scale, cz - 1.38 * scale, 0.16, 0.55 * scale, 0.78 * scale, colBody, mBody);
      // Four galloping legs
      for (const [lz, tilt] of [[-0.95, 0.35], [-0.55, -0.22], [0.65, 0.28], [1.05, -0.38]]) {
        mb.addCylinderBetween(
          [cx + inward * 0.08, cy - 0.35 * scale, cz + lz * scale],
          [cx + inward * 0.14, cy - 1.35 * scale, cz + (lz + tilt * 0.5) * scale],
          0.09 * scale, 0.04 * scale, 6, charcoal, mLine, true
        );
      }
      //Sweeping Aurochs horns or branching Megaloceros stag antlers!
      if (isStag) {
        for (let b = 0; b < 4; b++) {
          mb.addCylinderBetween(
            [cx + inward * 0.14, cy + 0.65 * scale, cz - 1.45 * scale],
            [cx + inward * 0.22, cy + (1.35 + b * 0.22) * scale, cz - (1.05 - b * 0.32) * scale],
            0.05 * scale, 0.02 * scale, 5, charcoal, mLine, true
          );
        }
      } else {
        mb.addCylinderBetween(
          [cx + inward * 0.14, cy + 0.62 * scale, cz - 1.45 * scale],
          [cx + inward * 0.24, cy + 1.18 * scale, cz - 2.05 * scale],
          0.07 * scale, 0.02 * scale, 6, charcoal, mLine, true
        );
        mb.addCylinderBetween(
          [cx + inward * 0.10, cy + 0.66 * scale, cz - 1.32 * scale],
          [cx + inward * 0.18, cy + 1.24 * scale, cz - 1.82 * scale],
          0.07 * scale, 0.02 * scale, 6, yellowOchre, mLine, true
        );
      }
    };

    addAnimalRelief(-5.35, 3.4, 8.5, -1, redOchre, 1.25, 0.5, false);
    addAnimalRelief(-5.25, 4.1, 0.5, -1, yellowOchre, 1.05, 1.7, true);
    addAnimalRelief(-5.35, 3.2, -8.5, -1, redOchre, 1.30, 3.1, false);
    addAnimalRelief(5.35, 3.6, 5.5, 1, yellowOchre, 1.15, 2.2, false);
    addAnimalRelief(5.25, 4.0, -3.5, 1, redOchre, 1.20, 4.0, true);
    addAnimalRelief(5.35, 3.3, -11.5, 1, yellowOchre, 1.10, 5.2, false);

    addPortalArchwayFrame(mb, -18.0, darkRock, flame, 7.0);
    addPortalArchwayFrame(mb, 18.0, darkRock, flame, 7.0);
    addBureaucracyLayer(mb, 3);

    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // WORLD 4: Origami Astronomical Clockwork (Pop-Up Paper World)
  // --------------------------------------------------------------------------
  function buildWorld4_Origami(gl) {
    const mb = new MeshBuilder();
    const vellum = [0.96, 0.90, 0.78];
    const warmCream = [0.92, 0.82, 0.66];
    const goldFoil = [0.85, 0.64, 0.24];
    const cinnabar = [0.68, 0.25, 0.18];
    const inkBlue = [0.22, 0.31, 0.45];

    const metaPaper = [8.0, 0, 0, 0];

    // Accordion-pleated pop-up vellum bridge walkway!
    for (let z = -18.0; z < 18.0; z += 1.2) {
      const zMid = z + 0.6;
      const zNext = z + 1.2;
      mb.addQuad(
        [-3.4, -0.18, z], [3.4, -0.18, z],
        [3.4, 0.06, zMid], [-3.4, 0.06, zMid],
        vellum, metaPaper, 2, 1
      );
      mb.addQuad(
        [-3.4, 0.06, zMid], [3.4, 0.06, zMid],
        [3.4, -0.18, zNext], [-3.4, -0.18, zNext],
        warmCream, metaPaper, 2, 1
      );
      // Gold foil edge trim
      mb.addBox(-3.45, -0.04, zMid, 0.12, 0.28, 1.22, goldFoil, [1.0, 0, 0, 0]);
      mb.addBox(3.45, -0.04, zMid, 0.12, 0.28, 1.22, goldFoil, [1.0, 0, 0, 0]);
    }

    // Exact No-Slip Pitch-Circle Origami Gear Train (ω₁r₁ = -ω₂r₂, module m = 0.145m/tooth!)
    // Driven by uEscapementAngle (animMode = 8.0) from RK4 Nonlinear Anchor Escapement!
    const mod = 0.145;
    const gears = [
      // Left meshed pair at z = -5.0: r1=16*m=2.32, r2=9*m=1.305 -> dy = 3.625 (exact tangent contact!)
      [-5.3, 3.900, -5.0, 16, 0.35, vellum,    goldFoil, +18 / 16],
      [-5.3, 7.525, -5.0,  9, 0.30, cinnabar,  goldFoil, -18 / 9],
      // Right meshed pair at z = -8.5: r3=15*m=2.175, r4=10*m=1.45 -> dy = 3.625 (exact tangent contact!)
      [5.4,  4.100, -8.5, 15, 0.36, warmCream, goldFoil, -18 / 15],
      [5.4,  7.725, -8.5, 10, 0.30, inkBlue,   goldFoil, +18 / 10],
      // Foreground pair at z = +6.0 & +4.5
      [-5.4, 3.800,  7.5, 12, 0.34, vellum,    cinnabar, +18 / 12],
      [5.4,  4.000,  4.5, 12, 0.34, warmCream, inkBlue,  -18 / 12],
      // Master Crown 18-tooth Escape Wheel at (0.0, 8.9, -12.5) directly above RK4 Anchor Pendulum!
      [0.0,  8.900, -12.5, 18, 0.32, vellum,   goldFoil, +1.0]
    ];
    for (const [gx, gy, gz, teeth, th, c0, c1, ratio] of gears) {
      const pitchR = teeth * mod;
      const ir = pitchR - mod * 0.95;
      const or = pitchR + mod * 0.95;
      mb.addOrigamiGear(gx, gy, gz, ir, or, teeth, th, c0, c1, 8.0, ratio, 8.0);
      mb.addCylinderBetween([gx, gy, gz - 0.6], [gx, gy, gz + 0.6], 0.18, 0.18, 8, goldFoil, [2.0, 0, 0, 0], true);
    }

    // Concentric folded paper Astrolabe rings arching over the promenade
    for (let z = -14.0; z <= 14.0; z += 7.0) {
      const segs = 20;
      const rad = 6.9;
      for (let s = 0; s < segs; s++) {
        const a0 = (s / segs) * Math.PI;
        const a1 = ((s + 1) / segs) * Math.PI;
        const p0 = [Math.cos(a0) * rad, Math.sin(a0) * rad, z];
        const p1 = [Math.cos(a1) * rad, Math.sin(a1) * rad, z];
        const col = s % 2 === 0 ? vellum : inkBlue;
        mb.addCylinderBetween(p0, p1, 0.16, 0.16, 4, col, metaPaper, false);
      }
    }

    // Floating folded paper stars / polyhedra
    for (const [sx, sy, sz, seed] of [
      [-3.8, 6.2, 1.0, 0.7], [3.8, 6.4, -2.5, 2.1], [-3.6, 5.8, -11.5, 3.9]
    ]) {
      mb.addOctahedron(sx, sy, sz, 0.75, vellum, [8.0, 1.0, seed, 0]);
      mb.addOctahedron(sx, sy, sz, 0.52, goldFoil, [1.0, 1.0, seed + 1.0, 0]);
    }

    addPortalArchwayFrame(mb, -18.0, inkBlue, goldFoil, 8.0);
    addPortalArchwayFrame(mb, 18.0, inkBlue, goldFoil, 8.0);
    addBureaucracyLayer(mb, 4);

    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // WORLD 5: Hyperbolic Glass Scriptorium
  // --------------------------------------------------------------------------
  function buildWorld5_Scriptorium(gl) {
    const mb = new MeshBuilder();
    const cyanGlass = [0.42, 0.90, 0.92];
    const violetGlass = [0.66, 0.36, 0.92];
    const goldCaustic = [1.00, 0.68, 0.22];
    const obsidian = [0.05, 0.08, 0.16];

    const metaGlass = [9.0, 0, 0, 0];
    const metaMirror = [10.0, 0, 0, 0];

    // Infinite-look dark Obsidian Mirror Sea floor
    mb.addQuad(
      [-26.0, -0.02, 24.0], [26.0, -0.02, 24.0],
      [26.0, -0.02, -24.0], [-26.0, -0.02, -24.0],
      obsidian, metaMirror, 12, 12
    );

    // Translucent crystal walkway spine skimming above the mirror sea
    mb.addBox(0, 0.04, 0, 5.6, 0.08, 38.0, cyanGlass, metaGlass);

    // Soaring Hyperbolic Lancet Gothic Ribs & Inverted Mirror Reflections beneath the sea!
    for (let i = 0; i <= 10; i++) {
      const z = -15.0 + i * 3.0;
      const col = i % 2 === 0 ? cyanGlass : violetGlass;
      const segs = 10;
      for (const side of [-1, 1]) {
        let prevUp = [side * 5.8, 0.0, z];
        let prevDn = [side * 5.8, 0.0, z];
        for (let s = 1; s <= segs; s++) {
          const t = s / segs;
          // Pointed hyperbolic gothic lancet curve meeting at crown (0, 11.2, z)
          const x = side * 5.8 * Math.pow(1.0 - t, 1.35);
          const y = 11.2 * Math.pow(t, 0.78);
          const zCurve = z + Math.sin(t * Math.PI) * (i % 2 === 0 ? 1.1 : -1.1);
          const curUp = [x, y, zCurve];
          const curDn = [x, -y * 0.65, zCurve]; // Shimmering sub-surface reflection twin!
          mb.addCylinderBetween(prevUp, curUp, 0.19 - t * 0.07, 0.17 - t * 0.07, 6, col, metaGlass, false);
          mb.addCylinderBetween(prevDn, curDn, 0.14 - t * 0.05, 0.12 - t * 0.05, 5, col, metaGlass, false);
          prevUp = curUp;
          prevDn = curDn;
        }
      }
      // Luminous crown keystone prism
      mb.addOctahedron(0, 11.2, z, 0.38, goldCaustic, [1.0, 1.0, i * 0.6, 0]);
    }

    // Floating Luminous Prism Codices / Scriptorium Tablets along catenary arcs
    for (let i = 0; i < 16; i++) {
      const z = -14.5 + i * 1.95;
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (3.7 + (i % 3) * 0.55);
      const y = 2.1 + (i % 4) * 1.15;
      const col = i % 3 === 0 ? goldCaustic : i % 2 === 0 ? cyanGlass : violetGlass;
      mb.addBox(x, y, z, 0.08, 0.92, 0.68, col, [9.0, 1.0, i * 0.85, 0], 0.18, side * 0.45);
    }

    addPortalArchwayFrame(mb, -18.0, violetGlass, cyanGlass, 9.0);
    addPortalArchwayFrame(mb, 18.0, violetGlass, cyanGlass, 9.0);
    addBureaucracyLayer(mb, 5);

    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // Recessed FBO Portal Volume (Valve Portal / Sebastian Lague Anti-Clip Cap)
  // Opening spans x in [-3.1, +3.1], y in [0.0, 6.6].
  // For Exit Portal at z = -18.0: recessed box extends z in [-18.42, -18.0],
  // inward-facing so camera near-plane (0.08) NEVER clips open before crossing!
  // --------------------------------------------------------------------------
  function buildPortalVolumeVAO(gl, isExitPortal) {
    const verts = [];
    const indices = [];
    let vc = 0;
    const push = (x, y, z, u, v) => {
      verts.push(x, y, z, u, v);
      return vc++;
    };
    const quad = (p0, p1, p2, p3) => {
      const i0 = push(p0[0], p0[1], p0[2], 0, 0);
      const i1 = push(p1[0], p1[1], p1[2], 1, 0);
      const i2 = push(p2[0], p2[1], p2[2], 1, 1);
      const i3 = push(p3[0], p3[1], p3[2], 0, 1);
      indices.push(i0, i1, i2, i0, i2, i3);
    };

    const x0 = -3.12, x1 = 3.12;
    const y0 = 0.0,   y1 = 6.62;
    if (isExitPortal) {
      const zFront = -18.0;
      const zBack = -18.45;
      // Back wall (facing +Z)
      quad([x0, y0, zBack], [x1, y0, zBack], [x1, y1, zBack], [x0, y1, zBack]);
      // Left inner wall (facing +X)
      quad([x0, y0, zFront], [x0, y0, zBack], [x0, y1, zBack], [x0, y1, zFront]);
      // Right inner wall (facing -X)
      quad([x1, y0, zBack], [x1, y0, zFront], [x1, y1, zFront], [x1, y1, zBack]);
      // Top inner wall (facing -Y)
      quad([x0, y1, zBack], [x1, y1, zBack], [x1, y1, zFront], [x0, y1, zFront]);
      // Bottom inner wall (facing +Y)
      quad([x0, y0, zFront], [x1, y0, zFront], [x1, y0, zBack], [x0, y0, zBack]);
    } else {
      // Entry portal at z = +18.0 (facing -Z for backward traversal!)
      const zFront = 18.0;
      const zBack = 18.45;
      quad([x1, y0, zBack], [x0, y0, zBack], [x0, y1, zBack], [x1, y1, zBack]);
      quad([x0, y0, zBack], [x0, y0, zFront], [x0, y1, zFront], [x0, y1, zBack]);
      quad([x1, y0, zFront], [x1, y0, zBack], [x1, y1, zBack], [x1, y1, zFront]);
      quad([x1, y1, zBack], [x0, y1, zBack], [x0, y1, zFront], [x1, y1, zFront]);
      quad([x1, y0, zFront], [x0, y0, zFront], [x0, y0, zBack], [x1, y0, zBack]);
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
    gl.bindVertexArray(null);

    return { vao, indexCount: indices.length };
  }

  // --------------------------------------------------------------------------
  // Quarantined Pet-Trope Mesh: "Cyclone of Circling Reindeer, Manta Rays & Storks"
  // Briefly materialized inside a red-gold Novelty Quarantine Shield when user
  // tests the Article II Semantic Novelty Filter!
  // --------------------------------------------------------------------------
  function buildQuarantinedCycloneVAO(gl) {
    const mb = new MeshBuilder();
    const colCyan = [0.35, 0.95, 1.0];
    const colMagenta = [1.0, 0.35, 0.72];
    const colGold = [1.0, 0.78, 0.25];

    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 4.0;
      const rad = 1.4 + (i / 18) * 2.2;
      const cx = Math.cos(ang) * rad;
      const cz = -4.5 + Math.sin(ang) * rad;
      const cy = 1.2 + i * 0.32;
      const kind = i % 3;
      const meta = [16.0, 6.0, i * 0.35, 0.0];

      if (kind === 0) {
        // Stylized Reindeer (body + neck + branching antlers)
        mb.addBox(cx, cy, cz, 0.22, 0.28, 0.72, colGold, meta, 0, ang);
        mb.addCylinderBetween([cx, cy + 0.15, cz - 0.28], [cx, cy + 0.58, cz - 0.45], 0.06, 0.02, 5, colGold, meta, true);
        mb.addCylinderBetween([cx - 0.18, cy + 0.55, cz - 0.42], [cx + 0.18, cy + 0.55, cz - 0.42], 0.03, 0.03, 4, colGold, meta, true);
      } else if (kind === 1) {
        // Stylized Manta Ray (wide diamond pelagic wings + whip tail)
        mb.addTri([cx, cy, cz - 0.55], [cx - 0.85, cy + 0.08, cz + 0.1], [cx, cy + 0.06, cz + 0.42], colCyan, meta);
        mb.addTri([cx, cy, cz - 0.55], [cx, cy + 0.06, cz + 0.42], [cx + 0.85, cy + 0.08, cz + 0.1], colCyan, meta);
        mb.addCylinderBetween([cx, cy, cz + 0.4], [cx, cy - 0.05, cz + 1.05], 0.03, 0.008, 4, colCyan, meta, false);
      } else {
        // Stylized Stork (slender swept wings + long red-gold beak)
        mb.addTri([cx, cy, cz - 0.35], [cx - 0.75, cy + 0.22, cz + 0.05], [cx, cy, cz + 0.28], colMagenta, meta);
        mb.addTri([cx, cy, cz - 0.35], [cx, cy, cz + 0.28], [cx + 0.75, cy + 0.22, cz + 0.05], colMagenta, meta);
        mb.addCylinderBetween([cx, cy, cz - 0.35], [cx, cy - 0.06, cz - 0.85], 0.04, 0.008, 4, colGold, meta, true);
      }
    }
    return mb.uploadToGPU(gl);
  }

  // --------------------------------------------------------------------------
  // Atmospheric Particle Cloud VAO (Shared 420-particle seed cloud morphed in VS)
  // --------------------------------------------------------------------------
  function buildParticleCloudVAO(gl, count = 420) {
    const rand = mulberry32(480500);
    const data = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      data[i * 4 + 0] = (rand() * 2 - 1) * 9.5;  // x
      data[i * 4 + 1] = rand() * 8.8 + 0.2;      // y
      data[i * 4 + 2] = (rand() * 2 - 1) * 17.5; // z
      data[i * 4 + 3] = rand();                  // phase seed
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.bindVertexArray(null);
    return { vao, count };
  }

  // --------------------------------------------------------------------------
  // Dynamic Physics Meshes (Unit Rigid-Body Sphere, Euler Polyhedron,
  // Buoyant Edo Cedar Skiff, RK4 Escapement Pendulum, Torricelli Splash Ring)
  // --------------------------------------------------------------------------
  function buildPhysicsSphereVAO(gl) {
    const mb = new MeshBuilder();
    const rings = 12, sectors = 18;
    const brass = [0.94, 0.74, 0.30];
    const ivory = [0.95, 0.94, 0.90];
    const cyanBand = [0.35, 0.88, 0.94];
    const metaMetal = [2.0, 0, 0, 0];
    const metaGlow = [1.0, 0, 0, 0];

    for (let r = 0; r < rings; r++) {
      const th0 = (r / rings) * Math.PI;
      const th1 = ((r + 1) / rings) * Math.PI;
      const y0 = Math.cos(th0), sr0 = Math.sin(th0);
      const y1 = Math.cos(th1), sr1 = Math.sin(th1);

      for (let s = 0; s < sectors; s++) {
        const ph0 = (s / sectors) * Math.PI * 2;
        const ph1 = ((s + 1) / sectors) * Math.PI * 2;

        const p00 = [sr0 * Math.cos(ph0), y0, sr0 * Math.sin(ph0)];
        const p10 = [sr0 * Math.cos(ph1), y0, sr0 * Math.sin(ph1)];
        const p11 = [sr1 * Math.cos(ph1), y1, sr1 * Math.sin(ph1)];
        const p01 = [sr1 * Math.cos(ph0), y1, sr1 * Math.sin(ph0)];

        // Striped meridian & equatorial bands so rotational spin ω is clearly visible!
        const isEquator = r === 5 || r === 6;
        const isStripe = s % 3 === 0;
        const col = isEquator ? cyanBand : isStripe ? brass : ivory;
        const meta = isEquator ? metaGlow : metaMetal;

        const i0 = mb.pushVertex(p00[0], p00[1], p00[2], p00[0], p00[1], p00[2], s / sectors, r / rings, col, meta);
        const i1 = mb.pushVertex(p10[0], p10[1], p10[2], p10[0], p10[1], p10[2], (s + 1) / sectors, r / rings, col, meta);
        const i2 = mb.pushVertex(p11[0], p11[1], p11[2], p11[0], p11[1], p11[2], (s + 1) / sectors, (r + 1) / rings, col, meta);
        const i3 = mb.pushVertex(p01[0], p01[1], p01[2], p01[0], p01[1], p01[2], s / sectors, (r + 1) / rings, col, meta);
        mb.indices.push(i0, i2, i1, i0, i3, i2);
      }
    }
    return mb.uploadToGPU(gl);
  }

  // Asymmetric Triaxial Polyhedron (I1 != I2 != I3) for Torque-Free Euler Precession
  function buildEulerPolyhedronVAO(gl) {
    const mb = new MeshBuilder();
    const ivory = [0.92, 0.89, 0.82];
    const amber = [0.96, 0.74, 0.34];
    const charcoal = [0.28, 0.26, 0.23];
    // Distinct principal axis extents: x = 1.65 (I1 min), y = 1.02 (I2 intermediate!), z = 0.52 (I3 max)
    mb.addBox(0, 0, 0, 2.30, 0.34, 0.34, ivory, [0.0, 0, 0, 0]);
    mb.addBox(0, 0, 0, 0.34, 1.48, 0.34, charcoal, [0.0, 0, 0, 0]);
    mb.addOctahedron(0, 0, 0, 0.78, amber, [1.0, 0, 0, 0]);
    mb.addOctahedron(1.15, 0, 0, 0.28, amber, [1.0, 0, 0, 0]);
    mb.addOctahedron(-1.15, 0, 0, 0.28, amber, [1.0, 0, 0, 0]);
    return mb.uploadToGPU(gl);
  }

  // Sculpted Edo Cedar Oshiokuri-Bune Skiff for Archimedes Buoyancy in World 2
  function buildCedarSkiffVAO(gl) {
    const mb = new MeshBuilder();
    const cedar = [0.78, 0.58, 0.35];
    const darkWood = [0.46, 0.32, 0.18];
    const foam = [0.95, 0.93, 0.86];
    const metaWood = [0.0, 0, 0, 0];

    mb.addBox(0, 0.08, 0, 0.92, 0.34, 4.4, cedar, metaWood);
    mb.addBox(0, 0.28, -0.8, 0.96, 0.08, 0.28, darkWood, metaWood);
    mb.addBox(0, 0.28, 0.8, 0.96, 0.08, 0.28, darkWood, metaWood);
    // Swept Edo prow & stern
    mb.addCylinderBetween([0, 0.12, -2.1], [0, 0.86, -3.25], 0.28, 0.04, 6, cedar, metaWood, true);
    mb.addCylinderBetween([0, 0.12, 2.1], [0, 0.54, 2.85], 0.26, 0.06, 6, darkWood, metaWood, true);
    mb.addOctahedron(0, 0.90, -3.28, 0.10, foam, [1.0, 0, 0, 0]);
    return mb.uploadToGPU(gl);
  }

  // Horological Anchor-Escapement Pendulum VAO (Pivot at 0,0,0; Bob at L = 2.35m)
  function buildPendulumVAO(gl) {
    const mb = new MeshBuilder();
    const vellum = [0.96, 0.90, 0.78];
    const brass = [0.88, 0.68, 0.26];
    const cinnabar = [0.72, 0.26, 0.18];

    // Anchor escapement pallet arms engaging the bottom teeth of the 18-tooth crown wheel!
    mb.addCylinderBetween([0, 0, 0], [-1.18, 0.58, -0.22], 0.09, 0.055, 6, cinnabar, [8.0, 0, 0, 0], true);
    mb.addCylinderBetween([0, 0, 0], [1.18, 0.58, -0.22], 0.09, 0.055, 6, cinnabar, [8.0, 0, 0, 0], true);
    // Slender folded vellum & brass pendulum rod (L = 2.35m -> T ≈ 3.07s horological beat)
    mb.addCylinderBetween([0, 0, 0], [0, -2.35, 0], 0.065, 0.055, 8, brass, [2.0, 0, 0, 0], true);
    // Lenticular Origami gilded pendulum bob at L = 2.35m
    mb.addOrigamiGear(0, -2.35, 0, 0.54, 0.68, 12, 0.22, vellum, brass, 8.0, 0.0, 0.0);
    return mb.uploadToGPU(gl);
  }

  // Unit Horizontal Splash Ring / Droplet VAO for Armilla's Torricelli Water Jets
  function buildSplashRingVAO(gl) {
    const mb = new MeshBuilder();
    const waterCol = [0.70, 0.93, 1.0];
    const segs = 16;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      mb.addCylinderBetween(
        [Math.cos(a0), 0, Math.sin(a0)],
        [Math.cos(a1), 0, Math.sin(a1)],
        0.06, 0.06, 5, waterCol, [3.0, 0, 0, 0], false
      );
    }
    return mb.uploadToGPU(gl);
  }

  PE.Geometry = {
    buildAllWorlds(gl) {
      return [
        buildWorld0_Escher(gl),
        buildWorld1_Armilla(gl),
        buildWorld2_Hokusai(gl),
        buildWorld3_Lascaux(gl),
        buildWorld4_Origami(gl),
        buildWorld5_Scriptorium(gl)
      ];
    },
    buildHingedBillboards(gl) {
      return [0, 1, 2, 3, 4, 5].map((i) => buildHingedBillboardForWorld(gl, i));
    },
    buildPhysicsSphereVAO,
    buildEulerPolyhedronVAO,
    buildCedarSkiffVAO,
    buildPendulumVAO,
    buildSplashRingVAO,
    buildPortalVolumeVAO,
    buildQuarantinedCycloneVAO,
    buildParticleCloudVAO
  };
})();
