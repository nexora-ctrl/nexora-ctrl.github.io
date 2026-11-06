/**
 * NEXORA Hero Animation: vgpu Ambient Particles
 * Styled with NEXORA Theme Colors (Cyan #38bdf8 -> Violet #8b7dff -> Pink #f472b6)
 * Constant, relaxed, and atmospheric rotation speed without acceleration.
 */

(function () {
  'use strict';

  // Constant relaxed speed for a calm, graceful rotation
  const CONSTANT_SPEED = 0.32;

  // --- Smooth Spring Physics Helper for Gentle Tilt ---
  class Spring {
    constructor(initial, { stiffness = 40, damping = 18 } = {}) {
      this.value = initial;
      this.target = initial;
      this.velocity = 0;
      this.stiffness = stiffness;
      this.damping = damping;
    }

    set(target) {
      this.target = target;
    }

    update(dt) {
      const step = Math.min(dt, 0.04);
      const displacement = this.value - this.target;
      const springForce = -this.stiffness * displacement;
      const dampingForce = -this.damping * this.velocity;
      const acceleration = springForce + dampingForce;
      this.velocity += acceleration * step;
      this.value += this.velocity * step;
      return this.value;
    }
  }

  // WGSL Shader with NEXORA Brand Color Palette
  const WGSL_SHADER = `
    struct Globals {
      time: f32,
      intensity: f32,
      resolution: vec2f,
      tilt: f32,
      spread: f32,
      theme: f32,
      pad2: f32,
    };

    @group(0) @binding(0) var<uniform> globals: Globals;

    override PARTICLE_SIZE: f32 = 1.0;
    override CLOUD_WIDTH: f32 = 1.0;
    override OPACITY: f32 = 1.0;
    override SEED_OFFSET: f32 = 0.0;

    // NEXORA Dynamic Spectrum: Vibrant, multi-colored cosmic palette adapted for Dark & Light modes
    fn palette(t: f32, theme: f32) -> vec3f {
      let x = fract(t);
      let segment = x * 6.0;
      let idx = i32(floor(segment));
      let f = fract(segment);

      if (theme < 0.5) {
        // Dark mode: luminous cosmic nebula (Cyan, Violet, Pink, Amber Gold, Mint Emerald, Royal Cobalt)
        let c0 = vec3f(0.22, 0.74, 0.97); // #38bdf8 Electric Sky
        let c1 = vec3f(0.66, 0.33, 0.97); // #a855f7 Vivid Violet
        let c2 = vec3f(0.96, 0.45, 0.71); // #f472b6 Glowing Magenta Pink
        let c3 = vec3f(0.98, 0.75, 0.14); // #fbbf24 Warm Amber Gold
        let c4 = vec3f(0.20, 0.83, 0.60); // #34d399 Mint Emerald
        let c5 = vec3f(0.23, 0.51, 0.96); // #3b82f6 Royal Cobalt

        if (idx == 0) { return mix(c0, c1, f); }
        else if (idx == 1) { return mix(c1, c2, f); }
        else if (idx == 2) { return mix(c2, c3, f); }
        else if (idx == 3) { return mix(c3, c4, f); }
        else if (idx == 4) { return mix(c4, c5, f); }
        else { return mix(c5, c0, f); }
      } else {
        // Light mode: rich, saturated jewel tones (Ocean Blue, Deep Purple, Crimson, Deep Amber, Forest Teal, Sapphire)
        let c0 = vec3f(0.01, 0.52, 0.78); // #0284c7 Ocean Blue
        let c1 = vec3f(0.49, 0.23, 0.93); // #7c3aed Deep Purple
        let c2 = vec3f(0.88, 0.11, 0.28); // #e11d48 Crimson Rose
        let c3 = vec3f(0.85, 0.47, 0.02); // #d97706 Deep Amber
        let c4 = vec3f(0.02, 0.59, 0.41); // #059669 Forest Emerald
        let c5 = vec3f(0.11, 0.31, 0.85); // #1d4ed8 Sapphire Cobalt

        if (idx == 0) { return mix(c0, c1, f); }
        else if (idx == 1) { return mix(c1, c2, f); }
        else if (idx == 2) { return mix(c2, c3, f); }
        else if (idx == 3) { return mix(c3, c4, f); }
        else if (idx == 4) { return mix(c4, c5, f); }
        else { return mix(c5, c0, f); }
      }
    }

    fn hash11(value: f32) -> f32 {
      return fract(sin(value * 12.9898) * 43758.5453);
    }

    fn centeredRandom(id: f32, offset: f32) -> f32 {
      return (
        hash11(id + offset) +
        hash11(id + offset + 19.19) +
        hash11(id + offset + 41.73) -
        1.5
      ) / 1.5;
    }

    struct VertexOut {
      @builtin(position) position: vec4f,
      @location(0) local: vec2f,
      @location(1) colour: vec3f,
      @location(2) alpha: f32,
    };

    @vertex
    fn vs_main(
      @builtin(vertex_index) vertexIndex: u32,
      @builtin(instance_index) instanceIndex: u32
    ) -> VertexOut {
      let corners = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, 1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(1.0, 1.0)
      );

      let id = f32(instanceIndex) + SEED_OFFSET;
      let seed = hash11(id + 1.0);
      let speed = 0.22 + hash11(id + 2.0) * 0.14;
      let phase = seed * 6.283185 + globals.time * speed;
      let radialOffset = centeredRandom(id, 3.0);
      let axialOffset = centeredRandom(id, 7.0);
      let tiltOffset = centeredRandom(id, 11.0);
      let rotationOffset = centeredRandom(id, 15.0);
      let radius = 1.08 + radialOffset * 0.25 * CLOUD_WIDTH * globals.spread;
      let axial = axialOffset * 0.34 * CLOUD_WIDTH * globals.spread;
      let angle = phase + centeredRandom(id, 17.0) * 0.04;
      let tilt = globals.tilt + tiltOffset * 0.16;
      let cylinder = vec3f(
        cos(angle) * radius,
        sin(angle) * radius,
        axial
      );
      let tilted = vec3f(
        cylinder.x,
        cylinder.y * cos(tilt) + cylinder.z * sin(tilt),
        -cylinder.y * sin(tilt) + cylinder.z * cos(tilt)
      );

      let rotation = -0.24 + rotationOffset * 0.16;
      let rotated = vec2f(
        tilted.x * cos(rotation) - tilted.y * sin(rotation),
        tilted.x * sin(rotation) + tilted.y * cos(rotation)
      );
      let near = clamp(0.5 + tilted.z * 0.68, 0.0, 1.0);
      let perspective = 1.0 / (1.0 - tilted.z * 0.48);

      // Keep aspect ratio 1:1 and enlarge cylinder across the hero
      let minDim = min(globals.resolution.x, globals.resolution.y);
      let normX = globals.resolution.x / minDim;
      let normY = globals.resolution.y / minDim;
      let scale = 1.58;
      let center = vec2f(0.0, 0.0);
      let particleCenter = vec2f((rotated.x * scale) / normX, (rotated.y * scale) / normY) * perspective + center;

      let depthScale = mix(0.7, 2.1, near);
      let viewportScale = clamp(
        min(globals.resolution.x, globals.resolution.y) / 650.0,
        0.9,
        3.0
      );
      let size = (1.0 + hash11(id + 5.0) * 1.3) * PARTICLE_SIZE * depthScale * viewportScale * 1.45;
      let corner = corners[vertexIndex];
      let pixelSize = vec2f(2.0 / globals.resolution.x, 2.0 / globals.resolution.y);

      var out: VertexOut;
      out.position = vec4f(particleCenter + corner * pixelSize * size, 0.0, 1.0);
      out.local = corner;
      out.colour = palette(phase / 6.283185 + seed * 0.18 + globals.time * 0.018, globals.theme);
      out.alpha = OPACITY * mix(0.40, 1.0, near) * globals.intensity;
      return out;
    }

    @fragment
    fn fs_main(
      @location(0) local: vec2f,
      @location(1) colour: vec3f,
      @location(2) alpha: f32
    ) -> @location(0) vec4f {
      let distance = length(local);
      if (distance > 1.0) {
        discard;
      }
      let point = 1.0 - smoothstep(0.28, 1.0, distance);
      let brightColour = colour * 1.32;
      return vec4f(brightColour * point * alpha, point * alpha);
    }
  `;

  // Start initialization when DOM is ready
  function initHeroAnimation() {
    const hero = document.querySelector('.hero');
    const canvas = document.getElementById('vgpuCanvas');

    if (!hero || !canvas) return;

    // Gentle tilt spring (calm ambient depth response)
    const tilt = new Spring(0.88, { stiffness: 35, damping: 20 });
    let isVisible = true;
    let lastTime = performance.now();

    // Subtle pointer parallax tilt only — NO SPEED CHANGE
    function onPointerMove(e) {
      const rect = hero.getBoundingClientRect();
      const yProgress = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
      // Gentle shift of tilt angle between 0.76 and 0.98
      tilt.set(0.76 + yProgress * 0.22);
    }

    hero.addEventListener('pointermove', onPointerMove, { passive: true });

    // Intersection observer: pause loop when hero is scrolled out of view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
              lastTime = performance.now();
            }
          });
        },
        { threshold: 0.05 }
      );
      observer.observe(hero);
    }

    // Try WebGPU first, then gracefully fall back to Canvas2D
    if (navigator.gpu) {
      initWebGPU(canvas, hero, { tilt })
        .then(() => {
          canvas.classList.add('is-ready');
        })
        .catch((err) => {
          console.warn('[NEXORA] WebGPU init failed, using Canvas2D fallback:', err);
          initCanvasFallback(canvas, hero, { tilt });
          canvas.classList.add('is-ready');
        });
    } else {
      initCanvasFallback(canvas, hero, { tilt });
      canvas.classList.add('is-ready');
    }
  }

  // --- WebGPU Engine ---
  async function initWebGPU(canvas, hero, { tilt }) {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No GPU adapter found');

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format,
      alphaMode: 'premultiplied',
    });

    const module = device.createShaderModule({ code: WGSL_SHADER });

    // Uniform buffer (32 bytes = 8 floats: time, intensity, resX, resY, tilt, spread, pad1, pad2)
    const uniformBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    const blend = {
      color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
    };

    const corePipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module,
        entryPoint: 'vs_main',
        constants: {
          PARTICLE_SIZE: 1.25,
          CLOUD_WIDTH: 1.15,
          OPACITY: 1.0,
          SEED_OFFSET: 0.0,
        },
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{ format, blend }],
      },
      primitive: { topology: 'triangle-list' },
    });

    const dustPipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module,
        entryPoint: 'vs_main',
        constants: {
          PARTICLE_SIZE: 1.65,
          CLOUD_WIDTH: 1.75,
          OPACITY: 0.16,
          SEED_OFFSET: 20000.0,
        },
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{ format, blend }],
      },
      primitive: { topology: 'triangle-list' },
    });

    const uniformData = new Float32Array(8);
    let width = 0;
    let height = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = hero.getBoundingClientRect();
      const newWidth = Math.max(Math.floor(rect.width * dpr), 300);
      const newHeight = Math.max(Math.floor(rect.height * dpr), 300);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        width = newWidth;
        height = newHeight;
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    let elapsed = 0;
    let lastTime = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Constant calm ambient speed — never speeds up
      elapsed += dt * CONSTANT_SPEED;

      // Gentle spring tilt
      const currentTilt = tilt.update(dt);

      // Pack uniforms: [time, intensity, resX, resY, tilt, spread, theme, pad2]
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      uniformData[0] = elapsed;
      uniformData[1] = 1.0;
      uniformData[2] = width;
      uniformData[3] = height;
      uniformData[4] = currentTilt;
      uniformData[5] = 1.0;
      uniformData[6] = isLight ? 1.0 : 0.0;
      uniformData[7] = 0.0;
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      // Render pass
      const commandEncoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });

      renderPass.setBindGroup(0, bindGroup);

      // Draw dust layer (2,500 particles)
      renderPass.setPipeline(dustPipeline);
      renderPass.draw(6, 2500);

      // Draw core layer (9,000 particles)
      renderPass.setPipeline(corePipeline);
      renderPass.draw(6, 9000);

      renderPass.end();
      device.queue.submit([commandEncoder.finish()]);
    }

    requestAnimationFrame(frame);
  }

  // --- High-Performance Canvas2D Fallback ---
  function initCanvasFallback(canvas, hero, { tilt }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = hero.getBoundingClientRect();
      width = Math.max(Math.floor(rect.width * dpr), 300);
      height = Math.max(Math.floor(rect.height * dpr), 300);
      canvas.width = width;
      canvas.height = height;
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Pre-generate particle descriptors (2,200 particles for high framerate)
    const COUNT = 2200;
    const particles = new Float32Array(COUNT * 6);

    function hash11(value) {
      return (Math.sin(value * 12.9898) * 43758.5453) % 1;
    }

    function centeredRandom(id, offset) {
      const h1 = Math.abs(Math.sin((id + offset) * 12.9898) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin((id + offset + 19.19) * 12.9898) * 43758.5453) % 1;
      const h3 = Math.abs(Math.sin((id + offset + 41.73) * 12.9898) * 43758.5453) % 1;
      return (h1 + h2 + h3 - 1.5) / 1.5;
    }

    for (let i = 0; i < COUNT; i++) {
      const p = i * 6;
      const id = i;
      particles[p] = Math.abs(hash11(id + 1.0));
      particles[p + 1] = 0.22 + Math.abs(hash11(id + 2.0)) * 0.14;
      particles[p + 2] = centeredRandom(id, 3.0);
      particles[p + 3] = centeredRandom(id, 7.0);
      particles[p + 4] = centeredRandom(id, 11.0);
      particles[p + 5] = centeredRandom(id, 15.0);
    }

    // NEXORA Dynamic Spectrum Palette: multi-color cosmic colors for Dark & Light modes
    function palette(t, isLight) {
      const x = ((t % 1) + 1) % 1;
      const segment = x * 6;
      const idx = Math.floor(segment);
      const f = segment - idx;

      let colors;
      if (!isLight) {
        // Dark mode: Cyan, Violet, Pink, Amber Gold, Mint Emerald, Royal Cobalt
        colors = [
          [56, 189, 248],   // #38bdf8 Cyan
          [168, 85, 247],   // #a855f7 Violet
          [244, 114, 182],  // #f472b6 Pink
          [251, 191, 36],   // #fbbf24 Amber Gold
          [52, 211, 153],   // #34d399 Mint Emerald
          [59, 130, 246]    // #3b82f6 Royal Cobalt
        ];
      } else {
        // Light mode: Ocean Blue, Deep Purple, Crimson, Amber Tangerine, Forest Emerald, Sapphire Cobalt
        colors = [
          [2, 132, 199],    // #0284c7 Ocean Blue
          [124, 58, 237],   // #7c3aed Deep Purple
          [225, 29, 72],    // #e11d48 Crimson Rose
          [217, 119, 6],    // #d97706 Deep Amber
          [5, 150, 105],    // #059669 Forest Emerald
          [29, 78, 216]     // #1d4ed8 Sapphire Cobalt
        ];
      }

      const c1 = colors[idx % 6];
      const c2 = colors[(idx + 1) % 6];
      const r = c1[0] + (c2[0] - c1[0]) * f;
      const g = c1[1] + (c2[1] - c1[1]) * f;
      const b = c1[2] + (c2[2] - c1[2]) * f;
      return [Math.round(r), Math.round(g), Math.round(b)];
    }

    let elapsed = 0;
    let lastTime = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Constant calm speed
      elapsed += dt * CONSTANT_SPEED;
      const currentTilt = tilt.update(dt);

      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const aspect = width / height;
      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * 0.74;

      ctx.globalCompositeOperation = isLight ? 'source-over' : 'lighter';

      for (let i = 0; i < COUNT; i++) {
        const p = i * 6;
        const seed = particles[p];
        const pSpeed = particles[p + 1];
        const radialOffset = particles[p + 2];
        const axialOffset = particles[p + 3];
        const tiltOffset = particles[p + 4];
        const rotOffset = particles[p + 5];

        const phase = seed * 6.283185 + elapsed * pSpeed;
        const radius = 1.05 + radialOffset * 0.24;
        const axial = axialOffset * 0.32;
        const angle = phase;
        const pTilt = currentTilt + tiltOffset * 0.16;

        const cyX = Math.cos(angle) * radius;
        const cyY = Math.sin(angle) * radius;
        const cyZ = axial;

        const cosT = Math.cos(pTilt);
        const sinT = Math.sin(pTilt);
        const tx = cyX;
        const ty = cyY * cosT + cyZ * sinT;
        const tz = -cyY * sinT + cyZ * cosT;

        const rot = -0.24 + rotOffset * 0.16;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const rx = tx * cosR - ty * sinR;
        const ry = tx * sinR + ty * cosR;

        const near = Math.max(0, Math.min(1, 0.5 + tz * 0.68));
        const perspective = 1.0 / (1.0 - tz * 0.48);

        const screenX = cx + (rx / aspect) * perspective * baseScale;
        const screenY = cy + ry * perspective * baseScale;

        const pSize = (1.5 + seed * 2.4) * (0.7 + near * 1.35) * dpr;
        const [r, g, b] = palette(phase / 6.283185 + seed * 0.18 + elapsed * 0.018, isLight);
        const alpha = isLight
          ? Math.max(0.35, Math.min(0.92, 0.40 + near * 0.55))
          : Math.max(0.20, Math.min(0.95, 0.42 + near * 0.68));

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pSize, 0, 6.283185);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
    }

    requestAnimationFrame(frame);
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroAnimation);
  } else {
    initHeroAnimation();
  }
})();
