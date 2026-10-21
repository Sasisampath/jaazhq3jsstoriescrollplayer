import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SHOW_NAME } from "@/data/episodes";
import type { ConsoleMedia } from "@/data/media";
import { CASE_H, CASE_T, CASE_W, createCaseShared, createEpisodeCase, drawContained } from "./episode-case";

/* The FIRST TAKE console: one light-oak media console with a case archive in
   its left and right bays (cases stored spine-out), a minimal player in the
   middle and a rollable screen that rises out of a slit in the top.

   Two kinds of motion, kept apart on purpose:
   - Camera: a pure function of scroll progress (damped), so scrolling back
     always reverses it.
   - Loading a case: a physical action the visitor starts by choosing an
     episode. Each case has its own 0…1 clock (0 = in its bay, 1 = inside the
     player) that runs forwards or backwards, and the screen rises once a case
     is fully in.
   Frames are rendered only while something is still moving. */

export type StoriesLayout = "wide" | "tall";

export type ScreenRect = { left: number; top: number; width: number; height: number };

export type StoriesScene = {
  setProgress(progress: number): void;
  setLayout(layout: StoriesLayout): void;
  setReduced(reduced: boolean): void;
  setPointer(x: number, y: number): void;
  /** Index of the stored case under a stage-relative point. With `radius`
      (px), a near miss picks the closest case — for fingers on thin spines. */
  pick(x: number, y: number, radius?: number): number | null;
  setHover(index: number | null): void;
  /** One small "pull me" nudge on a stored case (discoverability hint). */
  nudge(index: number): void;
  /** A brief status-light flash: the player acknowledging a choice it already holds. */
  acknowledge(): void;
  /** Playback viewing: true eases the camera to the one canonical, square-on view of the
      screen and calls `onArrive` once it is there (scroll no longer moves the camera);
      false hands the camera back to scroll. */
  view(on: boolean, onArrive?: () => void): void;
  /** Load an episode. `instant` skips the travel (restore / reduced motion). */
  select(index: number | null, instant?: boolean): void;
  resize(width: number, height: number): void;
  setActive(active: boolean): void;
  dispose(): void;
};

type Options = {
  items: ConsoleMedia[];
  onContextLost: () => void;
  /** The screen's image area in stage pixels, or null while it is down / off-stage. */
  onScreen: (rect: ScreenRect | null) => void;
  /** Fires when a case finishes loading (index) or the player is emptied (null). */
  onLoaded: (index: number | null) => void;
  /** Stage point just under the hovered case (for a small attached label), or null. */
  onHoverAnchor: (point: { x: number; y: number } | null) => void;
  /** Stage points just under each shelf's row of cases (null when off-stage), for the shelf captions. */
  onShelfAnchors: (anchors: { left: { x: number; y: number } | null; right: { x: number; y: number } | null }) => void;
};

/* ── Dimensions (world units ≈ metres) ── */
const W = 3.0; // console width
const D = 0.85; // depth
const LEG_H = 0.2;
const BODY_H = 0.6;
const TOP = LEG_H + BODY_H;
const SLAB = 0.04;
const BAY_IN = 0.52; // half-gap between the bays = half the player width
const BAY_FLOOR = LEG_H + SLAB;
const PANEL_W = 2 * BAY_IN - 0.06;
const PANEL_H = BODY_H - 0.1;
const PANEL_T = 0.03;
const PANEL_FRONT = D / 2 + PANEL_T;
const SLOT_Y = LEG_H + BODY_H * 0.68;
const SLOT_W = 0.56;
// One FIRST TAKE case. Stored spine-out; the cover faces the viewer once pulled.
const CASE_PITCH = CASE_T + 0.01;
const SLOT_H = 0.054;
const FEATURE_AFTER = 0.45; // seconds of hover before a case comes fully forward

const IMG_W = 2.12;
const IMG_H = (IMG_W * 9) / 16;
const BEZEL = 0.045;
const SCREEN_W = IMG_W + BEZEL * 2;
const SCREEN_H = IMG_H + BEZEL * 2;
const SCREEN_Z = -D / 2 + 0.13;
const CAP_H = 0.026;
const SCREEN_RISE = SCREEN_H + 0.035;

const FOV = 30;
const PURPLE = 0x564ef0;

const LOAD_SECONDS = 2.3;
const RAISE_SECONDS = 2.1;

const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);
const lerp = THREE.MathUtils.lerp;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => ease(clamp01((p - a) / (b - a)));

/* ── Camera poses ──
   target, half-extents to fit, azimuth/elevation (radians), and a vertical
   shift (fraction of the view) that lowers the object under the heading. */
type Pose = [tx: number, ty: number, tz: number, halfW: number, halfH: number, azim: number, elev: number, shift: number];

const POSES = {
  wide: {
    full: [0, 0.62, 0, 2.6, 1.3, -0.4, 0.3, 0.1],
    fullUp: [0, 1.12, -0.1, 2.6, 1.85, -0.36, 0.22, 0.13],
    // First stop: the FIRST TAKE shelf on the right, with the player's edge for context.
    archiveRight: [0.66, 0.56, 0.3, 0.92, 0.48, -0.14, 0.1, 0],
    archive: [0, 0.62, 0.3, 1.66, 0.62, 0, 0.1, 0],
    archiveUp: [0, 1.1, 0.2, 1.8, 1.16, 0, 0.08, 0],
    player: [0, 0.56, 0.3, 1.02, 0.46, 0, 0.07, 0],
    screen: [0, TOP + SCREEN_H / 2 - 0.08, -0.1, 1.3, 0.92, 0, 0.05, 0],
    // Watching: screen centred and square-on in its own plane, large, console top still in view.
    playback: [0, TOP + SCREEN_H / 2 - 0.14, SCREEN_Z, 1.5, 0.98, 0, 0.02, 0],
  },
  tall: {
    full: [0, 0.5, 0, 1.68, 0.8, -0.5, 0.42, 0.1],
    fullUp: [0, 1.0, -0.1, 1.68, 1.9, -0.42, 0.3, 0.14],
    archiveLeft: [-0.5, 0.52, 0.3, 0.6, 0.45, 0.12, 0.12, 0],
    archiveRight: [0.5, 0.52, 0.3, 0.6, 0.45, -0.12, 0.12, 0],
    player: [0, 0.56, 0.3, 0.64, 0.42, 0, 0.08, 0],
    screen: [0, TOP + SCREEN_H / 2 - 0.12, -0.1, 1.14, 0.9, 0, 0.05, 0],
    playback: [0, TOP + SCREEN_H / 2 - 0.1, SCREEN_Z, 1.2, 0.95, 0, 0.02, 0],
  },
} satisfies Record<StoriesLayout, Record<string, Pose>>;

const mix = (a: Pose, b: Pose, t: number) => a.map((v, i) => lerp(v, b[i], t)) as Pose;

/* ── Painted textures ── */

function oakCanvas() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#dcc09a";
  ctx.fillRect(0, 0, c.width, c.height);
  // Long, gently wandering grain lines.
  for (let i = 0; i < 150; i += 1) {
    const y0 = (i * 97.3) % c.height;
    const amp = 2 + ((i * 13) % 7);
    const freq = 0.004 + ((i * 7) % 5) * 0.0012;
    ctx.strokeStyle = `rgba(${150 + (i % 30)}, ${110 + (i % 20)}, ${70 + (i % 15)}, ${0.06 + ((i * 31) % 10) / 90})`;
    ctx.lineWidth = 0.6 + ((i * 17) % 10) / 6;
    ctx.beginPath();
    for (let x = 0; x <= c.width; x += 16) {
      const y = y0 + Math.sin(x * freq + i) * amp + Math.sin(x * 0.0007 * i) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Soft pores.
  for (let i = 0; i < 2400; i += 1) {
    ctx.fillStyle = `rgba(120, 86, 50, ${0.03 + (i % 5) / 120})`;
    ctx.fillRect((i * 389.7) % c.width, (i * 211.3) % c.height, 3 + (i % 4), 1);
  }
  return c;
}

function brushedCanvas(fonts: { display: string; mono: string }) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = Math.round((1024 * PANEL_H) / PANEL_W);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#efebe3";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y += 1) {
    const a = ((y * 7919) % 13) / 260;
    ctx.fillStyle = y % 2 ? `rgba(255,255,255,${a})` : `rgba(120,110,95,${a * 0.7})`;
    ctx.fillRect(0, y, c.width, 1);
  }
  // Wordmark, bottom-left. Always "JazzHQ".
  const s = c.width / PANEL_W; // px per world unit
  ctx.fillStyle = "#26252a";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${Math.round(0.052 * s)}px ${fonts.display}`;
  ctx.fillText("JazzHQ", 0.075 * s, c.height - 0.075 * s);
  const markW = ctx.measureText("JazzHQ").width;
  ctx.fillStyle = "#8a857c";
  ctx.font = `500 ${Math.round(0.022 * s)}px ${fonts.mono}`;
  ctx.fillText(SHOW_NAME, 0.075 * s + markW + 0.03 * s, c.height - 0.08 * s);
  // Fine engraved ring where the knob sits.
  ctx.strokeStyle = "rgba(60,55,48,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.width - 0.17 * s, c.height - 0.16 * s, 0.075 * s, 0, Math.PI * 2);
  ctx.stroke();
  // Slot recess shading.
  const slotY = c.height - (SLOT_Y - (LEG_H + (BODY_H - PANEL_H) / 2)) * s;
  const grad = ctx.createLinearGradient(0, slotY - 0.03 * s, 0, slotY + 0.03 * s);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(70,60,45,0.12)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(c.width / 2 - (SLOT_W / 2 + 0.03) * s, slotY - 0.03 * s, (SLOT_W + 0.06) * s, 0.06 * s);
  return c;
}

function screenCanvas(img: HTMLImageElement | null) {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 720;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0d0d10";
  ctx.fillRect(0, 0, c.width, c.height);
  if (img) drawContained(ctx, img, 0, 0, c.width, c.height);
  return c;
}

function shadowCanvas() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.shadowColor = "rgba(48, 36, 20, 0.6)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 1024;
  ctx.fillStyle = "#000";
  ctx.fillRect(-1024 + 34, 34, 188, 60);
  return c;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function resolveFonts() {
  const root = getComputedStyle(document.documentElement);
  const display = `${root.getPropertyValue("--font-plus-jakarta").trim() || "'Plus Jakarta Sans'"}, Inter, system-ui, sans-serif`;
  const mono = `${root.getPropertyValue("--font-geist-mono").trim() || "'Geist Mono'"}, ui-monospace, monospace`;
  try {
    await Promise.all([document.fonts.load(`700 40px ${display}`), document.fonts.load(`500 20px ${mono}`)]);
  } catch {
    // Fallback fonts are fine.
  }
  return { display, mono };
}

/* ── Case layout: spine-out, each collection on its own shelf, in data order
   reading left → right. FIRST TAKE starts against the player on the right;
   the other conversations end against it on the left. An oak bookend closes
   each row. Each bay holds ~13 cases. ── */

type Slot = { x: number; z: number; bay: -1 | 1; k: number };

function archiveSlots(items: ConsoleMedia[]): Slot[] {
  const inner = BAY_IN + SLAB + 0.02;
  const left = items.filter((item) => item.side === "left").length;
  let l = 0;
  let r = 0;
  return items.map((item) => {
    const bay = item.side === "left" ? -1 : 1;
    const k = bay < 0 ? l++ : r++;
    const x = bay < 0 ? -inner - (left - 1 - k) * CASE_PITCH - CASE_T / 2 : inner + k * CASE_PITCH + CASE_T / 2;
    return { x, z: D / 2 - 0.045 - CASE_W / 2, bay, k };
  });
}

type Case = {
  group: THREE.Group;
  mesh: THREE.Mesh;
  slot: Slot;
  u: number; // 0 in bay … 1 inside the player
  target: number;
  hover: number; // 0 stored … 1 slid out and turned toward the viewer
  feature: number; // a held hover: a little further forward, cover square-on
  dwell: number;
  spread: number; // neighbours part away from a hovered case
  vel: Record<"hover" | "feature" | "spread", number>; // spring velocities
  nudge: number; // seconds into the one-off "pull me" hint, -1 when idle
  image: HTMLImageElement | null;
};

export async function createStoriesScene(canvas: HTMLCanvasElement, options: Options): Promise<StoriesScene> {
  const [fonts, images] = await Promise.all([resolveFonts(), Promise.all(options.items.map((item) => loadImage(item.thumbnail)))]);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const scene = new THREE.Scene();
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  const room = new RoomEnvironment();
  const envTarget = track(pmrem.fromScene(room, 0.04));
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.55;
  room.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    (mesh.material as THREE.Material | undefined)?.dispose?.();
  });

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xd8cfbf, 1.1));
  const key = new THREE.DirectionalLight(0xfff3e2, 1.6);
  key.position.set(-3, 5, 4);
  scene.add(key);

  const tex = (c: HTMLCanvasElement) => {
    const t = track(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  };

  /* ── Materials (shared) ── */
  const oakTex = tex(oakCanvas());
  const oak = track(new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.62, metalness: 0 }));
  const oakInner = track(new THREE.MeshStandardMaterial({ map: oakTex, color: 0xcfc3b2, roughness: 0.75 }));
  const offWhite = track(new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.5, metalness: 0.05 }));
  const panelFace = track(new THREE.MeshStandardMaterial({ map: tex(brushedCanvas(fonts)), roughness: 0.42, metalness: 0.08 }));
  const slotDark = track(new THREE.MeshStandardMaterial({ color: 0x141317, roughness: 0.8 }));
  const alu = track(new THREE.MeshStandardMaterial({ color: 0xd9d6d0, roughness: 0.28, metalness: 0.85 }));
  const graphite = track(new THREE.MeshStandardMaterial({ color: 0x1c1b20, roughness: 0.45, metalness: 0.2 }));
  const ledMat = track(new THREE.MeshStandardMaterial({ color: 0x8a86a6, emissive: PURPLE, emissiveIntensity: 0, roughness: 0.3 }));

  const rig = new THREE.Group();
  scene.add(rig);
  const box = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, radius = 0) => {
    const geo = track(radius > 0 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    rig.add(mesh);
    return mesh;
  };

  /* ── Body ── */
  box(W, SLAB, D, oak, 0, TOP - SLAB / 2, 0, 0.012); // top
  box(W, SLAB, D, oak, 0, LEG_H + SLAB / 2, 0, 0.012); // bottom
  for (const s of [-1, 1]) {
    box(SLAB, BODY_H, D, oak, s * (W / 2 - SLAB / 2), LEG_H + BODY_H / 2, 0, 0.012); // ends
    box(SLAB, BODY_H - SLAB * 2, D - 0.03, oak, s * (BAY_IN + SLAB / 2), LEG_H + BODY_H / 2, -0.015); // dividers
  }
  box(W - SLAB * 2, BODY_H - SLAB * 2, 0.02, oakInner, 0, LEG_H + BODY_H / 2, -D / 2 + 0.01); // back
  box(BAY_IN * 2, BODY_H - SLAB * 2, D - 0.03, offWhite, 0, LEG_H + BODY_H / 2, -0.015); // player block

  // Player face: brushed off-white, wordmark printed on it.
  box(PANEL_W, PANEL_H, PANEL_T, [offWhite, offWhite, offWhite, offWhite, panelFace, offWhite], 0, LEG_H + BODY_H / 2, D / 2 + PANEL_T / 2 - 0.001);
  box(SLOT_W, SLOT_H, 0.02, slotDark, 0, SLOT_Y, PANEL_FRONT - 0.0095);
  box(SLOT_W + 0.02, 0.006, 0.006, alu, 0, SLOT_Y + SLOT_H / 2 + 0.004, PANEL_FRONT); // lip

  const knob = new THREE.Mesh(track(new THREE.CylinderGeometry(0.052, 0.055, 0.04, 48)), alu);
  knob.rotation.x = Math.PI / 2;
  const knobX = PANEL_W / 2 - 0.17;
  const knobY = LEG_H + (BODY_H - PANEL_H) / 2 + 0.16;
  knob.position.set(knobX, knobY, PANEL_FRONT + 0.02);
  rig.add(knob);
  const tick = new THREE.Mesh(track(new THREE.BoxGeometry(0.004, 0.026, 0.002)), graphite);
  tick.position.set(knobX, knobY + 0.03, PANEL_FRONT + 0.041);
  rig.add(tick);

  const led = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 24)), ledMat);
  led.rotation.x = Math.PI / 2;
  led.position.set(-SLOT_W / 2 - 0.05, SLOT_Y, PANEL_FRONT + 0.002);
  rig.add(led);

  // Legs: slim, slightly tapered oak.
  const legGeo = track(new THREE.CylinderGeometry(0.032, 0.022, LEG_H, 20));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, oak);
      leg.position.set(sx * (W / 2 - 0.16), LEG_H / 2, sz * (D / 2 - 0.13));
      rig.add(leg);
    }
  }

  // Contact shadow on the page.
  const shadowMat = track(new THREE.MeshBasicMaterial({ map: tex(shadowCanvas()), transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false }));
  const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(W * 1.42, D * 2.3)), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.001;
  shadow.renderOrder = -1;
  rig.add(shadow);

  /* ── Rollable screen ── */
  const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP)];
  box(SCREEN_W + 0.06, 0.004, 0.034, slotDark, 0, TOP + 0.0005, SCREEN_Z); // slit in the top
  const screen = new THREE.Group();
  screen.position.set(0, TOP + 0.004, SCREEN_Z);
  rig.add(screen);
  const cap = new THREE.Mesh(track(new RoundedBoxGeometry(SCREEN_W + 0.04, CAP_H, 0.05, 3, 0.008)), alu);
  cap.position.y = -CAP_H / 2;
  screen.add(cap);
  const bezelMat = track(new THREE.MeshStandardMaterial({ color: 0x1c1b20, roughness: 0.45, metalness: 0.2, clippingPlanes: clip }));
  const panel = new THREE.Mesh(track(new THREE.BoxGeometry(SCREEN_W, SCREEN_H, 0.026)), bezelMat);
  panel.position.y = -CAP_H - SCREEN_H / 2;
  screen.add(panel);
  const imageMat = track(new THREE.MeshBasicMaterial({ color: 0x000000, clippingPlanes: clip, toneMapped: false }));
  const image = new THREE.Mesh(track(new THREE.PlaneGeometry(IMG_W, IMG_H)), imageMat);
  image.position.set(0, panel.position.y, 0.0135);
  screen.add(image);
  // A thin purple status line under the image, like a powered bezel.
  const statusMat = track(new THREE.MeshBasicMaterial({ color: PURPLE, transparent: true, opacity: 0, clippingPlanes: clip, toneMapped: false }));
  const status = new THREE.Mesh(track(new THREE.PlaneGeometry(0.12, 0.006)), statusMat);
  status.position.set(0, panel.position.y - IMG_H / 2 - BEZEL / 2, 0.0135);
  screen.add(status);

  /* ── Cases (one reusable builder, driven by the episode data) ── */
  const slots = archiveSlots(options.items);
  const caseShared = createCaseShared(track);
  const cases: Case[] = options.items.map((item, i) => {
    const slot = slots[i];
    const { group, pickMesh } = createEpisodeCase({ item, index: i, image: images[i], fonts, shared: caseShared, texture: tex, track });
    rig.add(group);
    return {
      group,
      mesh: pickMesh,
      slot,
      u: 0,
      target: 0,
      hover: 0,
      feature: 0,
      dwell: 0,
      spread: 0,
      vel: { hover: 0, feature: 0, spread: 0 },
      nudge: -1,
      image: images[i],
    };
  });
  // Bookends at the outer end of each row.
  for (const bay of [-1, 1] as const) {
    const row = slots.filter((sl) => sl.bay === bay);
    if (!row.length) continue;
    const outer = row.reduce((m, sl) => (bay < 0 ? Math.min(m, sl.x) : Math.max(m, sl.x)), row[0].x);
    box(0.03, 0.26, 0.24, oakInner, outer + bay * (CASE_T / 2 + 0.03), BAY_FLOOR + 0.13, row[0].z);
  }
  const pickables = cases.map((c) => c.mesh);

  let screenTex: THREE.CanvasTexture | null = null;
  let screenEpisode: number | null = null;

  /* ── State ── */
  let layout: StoriesLayout = "wide";
  let reduced = false;
  let progress = 0;
  let selected: number | null = null;
  let hovered: number | null = null;
  let loadedReported: number | null = null;
  let raise = 0; // 0 down … 1 up (linear clock; eased when applied)
  let ledPulse = 0; // 1 → 0 after acknowledge()
  /* Playback viewing: a short eased move from wherever the camera is to POSES.*.playback. */
  const VIEW_SECONDS = 0.8;
  let viewing = false;
  let viewFrom: Pose | null = null;
  let viewT = 1;
  let onArrive: (() => void) | null = null;
  const pointer = new THREE.Vector2();
  const pointerDamped = new THREE.Vector2();
  let view: Pose | null = null; // damped camera pose
  let width = 1;
  let height = 1;
  let active = true;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let lastRect = "";

  const goalPose = (): Pose => {
    const p = progress;
    const up = ease(raise);
    if (reduced) {
      // One calm frame of the whole console that widens to include the screen once it is up.
      const wholeWide: Pose = [0, 1.05, 0.1, 1.7, 1.15, 0, 0.08, 0];
      const wholeTall: Pose = [0, 0.95, 0.1, 1.62, 1.1, 0, 0.08, 0];
      return layout === "wide" ? mix(POSES.wide.archive, wholeWide, up) : wholeTall;
    }
    if (layout === "wide") {
      const P = POSES.wide;
      const screenPose = mix(P.player, P.screen, up);
      // Once the screen is up it is part of "the whole object", so the wide views make room for it.
      // full → FIRST TAKE shelf → both shelves → player → screen
      let pose = mix(mix(P.full, P.fullUp, up), P.archiveRight, span(p, 0.06, 0.26));
      pose = mix(pose, mix(P.archive, P.archiveUp, up), span(p, 0.38, 0.48));
      pose = mix(pose, P.player, span(p, 0.56, 0.68));
      return mix(pose, screenPose, span(p, 0.74, 0.9));
    }
    const P = POSES.tall;
    const screenPose = mix(P.player, P.screen, up);
    // full → FIRST TAKE (right) → more conversations (left) → player → screen
    let pose = mix(mix(P.full, P.fullUp, up), P.archiveRight, span(p, 0.05, 0.24));
    pose = mix(pose, P.archiveLeft, span(p, 0.34, 0.44));
    pose = mix(pose, P.player, span(p, 0.54, 0.64));
    return mix(pose, screenPose, span(p, 0.7, 0.88));
  };

  const applyCamera = (pose: Pose) => {
    const [tx, ty, tz, halfW, halfH, azim, elev, shift] = pose;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(halfH / tan, halfW / (tan * camera.aspect));
    camera.position.set(
      tx + dist * Math.sin(azim) * Math.cos(elev),
      ty + dist * Math.sin(elev),
      tz + dist * Math.cos(azim) * Math.cos(elev),
    );
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(width, height, 0, -shift * height, width, height);
    camera.updateProjectionMatrix();
  };

  /* Case pose. In the bay it is driven by hover/feature/spread (preview only);
     its 0…1 clock then takes it out, across to the slot and in:
     shelf → slide outward → turn cover to viewer → arc to player → insert. */
  const pos = new THREE.Vector3();
  const STORED_Y = Math.PI / 2; // spine to the front
  const placeCase = (c: Case) => {
    const { slot } = c;
    const u = c.u;
    const h = c.hover;
    const f = c.feature;
    // In-bay preview pose: it slides straight out first, then turns its cover to the viewer.
    const slide = ease(clamp01(h / 0.6));
    const face = ease(clamp01((h - 0.3) / 0.7));
    // One-off hint: lifts and leans out a few millimetres, pauses, settles back (the hover proper stays the visitor's).
    const n = c.nudge < 0 ? 0 : c.nudge < 0.45 ? ease(c.nudge / 0.45) : c.nudge < 0.95 ? 1 : 1 - ease(Math.min(1, (c.nudge - 0.95) / 0.6));
    const bx = slot.x + c.spread * 0.034;
    const by = BAY_FLOOR + slide * 0.012 + f * 0.03 + n * 0.013;
    const bz = slot.z + slide * 0.3 + f * 0.07 + n * 0.02;
    const bry = STORED_Y * (1 - 0.8 * face - 0.2 * f) - n * 0.07;
    // Selection path.
    const out = span(u, 0, 0.22);
    const turn = span(u, 0.08, 0.3);
    const travel = span(u, 0.3, 0.76);
    const insert = span(u, 0.76, 1);
    pos.set(
      lerp(bx, 0, travel),
      lerp(lerp(by, BAY_FLOOR + 0.05, out), SLOT_Y, travel) + Math.sin(Math.PI * travel) * 0.22,
      lerp(lerp(bz, D / 2 + 0.44, out), PANEL_FRONT + CASE_H + 0.05, travel) - insert * (CASE_H + 0.09),
    );
    c.group.position.copy(pos);
    c.group.rotation.set(-(Math.PI / 2) * travel, lerp(bry, 0, turn) + Math.sin(Math.PI * travel) * 0.25 * -Math.sign(slot.x), 0);
    c.group.visible = u < 0.999;
  };

  const step = (dt: number) => {
    let moving = false;
    const instant = reduced;

    // A case may only move into the player once the previous one is out of the slot.
    // One case in flight at a time: the one leaving the player goes all the way home
    // before the newly chosen case sets off, so they never cross mid-air.
    const busy = (self: Case) => cases.some((o) => o !== self && o.u > 0.001);
    for (const c of cases) {
      const goal = c.target === 1 && busy(c) ? c.u : c.target;
      if (c.u !== goal) {
        c.u = instant ? goal : goal > c.u ? Math.min(goal, c.u + dt / LOAD_SECONDS) : Math.max(goal, c.u - dt / (LOAD_SECONDS * 0.65));
        moving = true;
      }
      const isHovered = cases.indexOf(c) === hovered && c.u === 0 && c.target === 0;
      if (c.nudge >= 0) {
        c.nudge = isHovered || c.target !== 0 ? -1 : c.nudge + dt;
        if (c.nudge > 1.55) c.nudge = -1;
        moving = true;
      }
      c.dwell = isHovered ? c.dwell + dt : 0;
      if (isHovered && c.dwell < FEATURE_AFTER + 0.05) moving = true; // keep ticking until the dwell completes
      const other = hovered !== null ? cases[hovered] : null;
      const gap = other && other !== c && other.slot.bay === c.slot.bay ? Math.abs(other.slot.k - c.slot.k) : 0;
      const spreadGoal = other && gap > 0 && gap <= 2 && other.u === 0 ? Math.sign(c.slot.k - other.slot.k) * (gap === 1 ? 1 : 0.35) : 0;
      // Critically damped springs: soft start, no overshoot, settles exactly on the slot.
      const goals: Array<[keyof Case["vel"], number, number]> = [
        ["hover", isHovered ? 1 : 0, 70],
        ["feature", isHovered && c.dwell >= FEATURE_AFTER ? 1 : 0, 40],
        ["spread", spreadGoal, 70],
      ];
      for (const [key, g, k] of goals) {
        if (c[key] === g && c.vel[key] === 0) continue;
        if (instant) {
          c[key] = g;
          c.vel[key] = 0;
          continue;
        }
        const damping = 2 * Math.sqrt(k);
        c.vel[key] += ((g - c[key]) * k - c.vel[key] * damping) * dt;
        c[key] += c.vel[key] * dt;
        if (Math.abs(c[key] - g) < 1e-3 && Math.abs(c.vel[key]) < 1e-2) {
          c[key] = g;
          c.vel[key] = 0;
        }
        moving = true;
      }
      placeCase(c);
    }

    // The screen follows whichever case is fully loaded; it only swaps image while down.
    const loadedCase = selected !== null && cases[selected].u >= 1 ? selected : null;
    if (loadedCase !== loadedReported) {
      loadedReported = loadedCase;
      options.onLoaded(loadedCase);
    }
    if (loadedCase !== null && screenEpisode !== loadedCase && raise <= 0) {
      screenTex?.dispose();
      screenTex = new THREE.CanvasTexture(screenCanvas(cases[loadedCase].image));
      screenTex.colorSpace = THREE.SRGBColorSpace;
      screenTex.anisotropy = anisotropy;
      imageMat.map = screenTex;
      imageMat.needsUpdate = true;
      screenEpisode = loadedCase;
    }
    const raiseGoal = loadedCase !== null && screenEpisode === loadedCase ? 1 : 0;
    if (raise !== raiseGoal) {
      raise = instant ? raiseGoal : raiseGoal > raise ? Math.min(1, raise + dt / RAISE_SECONDS) : Math.max(0, raise - dt / (RAISE_SECONDS * 0.6));
      moving = true;
    }
    const up = ease(raise);
    screen.position.y = TOP + 0.004 + up * SCREEN_RISE;
    const power = clamp01((raise - 0.82) / 0.18);
    imageMat.color.setScalar(lerp(0.05, 1, power));
    statusMat.opacity = power * 0.9;
    if (ledPulse > 0) {
      ledPulse = Math.max(0, ledPulse - dt / 0.9);
      moving = true;
    }
    const flash = Math.sin(Math.PI * Math.min(1, (1 - ledPulse) * 2)) * (ledPulse > 0 ? 1 : 0);
    ledMat.emissiveIntensity = (loadedCase !== null ? 1.4 : selected !== null ? 0.5 + 0.5 * Math.sin(performance.now() / 160) : 0) + flash * 2.6;
    ledMat.color.setHex(loadedCase !== null || selected !== null ? PURPLE : 0xb9b5c8);
    if (selected !== null && loadedCase === null) moving = true; // blinking LED while loading

    // Camera: while watching, a timed ease into the canonical playback view; otherwise damp toward the scroll pose.
    const goal = viewing ? POSES[layout].playback : goalPose();
    if (viewing) {
      viewT = instant ? 1 : Math.min(1, viewT + dt / VIEW_SECONDS);
      view = viewFrom && viewT < 1 ? mix(viewFrom, goal, ease(viewT)) : (goal.slice() as Pose);
      if (viewT < 1) moving = true;
    } else if (!view || instant) view = goal.slice() as Pose;
    else {
      let diff = 0;
      for (let i = 0; i < goal.length; i += 1) {
        view[i] = THREE.MathUtils.damp(view[i], goal[i], 7, dt);
        diff = Math.max(diff, Math.abs(view[i] - goal[i]));
      }
      if (diff > 1e-4) moving = true;
      else view = goal.slice() as Pose;
    }
    applyCamera(view);

    // Tiny pointer response on the opening frame only.
    const idle = layout === "wide" && !reduced && !viewing ? 1 - span(progress, 0.02, 0.2) : 0;
    const settle = viewing ? 14 : 4; // straighten the console quickly for playback
    pointerDamped.x = instant ? pointer.x * idle : THREE.MathUtils.damp(pointerDamped.x, pointer.x * idle, settle, dt);
    pointerDamped.y = instant ? pointer.y * idle : THREE.MathUtils.damp(pointerDamped.y, pointer.y * idle, settle, dt);
    if (viewing && viewT >= 1 && Math.abs(pointerDamped.x) < 1e-3 && Math.abs(pointerDamped.y) < 1e-3) {
      pointerDamped.set(0, 0);
      if (onArrive) {
        const done = onArrive;
        onArrive = null;
        queueMicrotask(done); // after this frame's render, so the screen rect is final
      }
    }
    if (Math.abs(pointerDamped.x - pointer.x * idle) > 1e-4 || Math.abs(pointerDamped.y - pointer.y * idle) > 1e-4) moving = true;
    rig.rotation.y = pointerDamped.x * 0.045;
    rig.rotation.x = pointerDamped.y * 0.012;

    return moving;
  };

  const corner = new THREE.Vector3();
  const reportScreen = () => {
    let rect: ScreenRect | null = null;
    if (raise >= 1) {
      image.updateWorldMatrix(true, false);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        corner.set((sx * IMG_W) / 2, (sy * IMG_H) / 2, 0).applyMatrix4(image.matrixWorld).project(camera);
        const x = ((corner.x + 1) / 2) * width;
        const y = ((1 - corner.y) / 2) * height;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const visible = maxX > 0 && minX < width && maxY > 0 && minY < height;
      if (visible) rect = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    }
    const keyStr = rect ? `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)},${Math.round(rect.height)}` : "";
    if (keyStr !== lastRect) {
      lastRect = keyStr;
      options.onScreen(rect);
    }
  };

  const shelfPoint = (bay: -1 | 1) => {
    const row = cases.filter((c) => c.slot.bay === bay);
    if (!row.length) return null;
    const x = row.reduce((sum, c) => sum + c.slot.x, 0) / row.length;
    corner.set(x, LEG_H - 0.012, D / 2).applyMatrix4(rig.matrixWorld).project(camera);
    const px = ((corner.x + 1) / 2) * width;
    const py = ((1 - corner.y) / 2) * height;
    return px > 0 && px < width && py > 0 && py < height ? { x: px, y: py } : null;
  };
  let lastShelves = "";
  const reportShelves = () => {
    const left = shelfPoint(-1);
    const right = shelfPoint(1);
    const key = [left, right].map((p) => (p ? `${Math.round(p.x)},${Math.round(p.y)}` : "-")).join("|");
    if (key !== lastShelves) {
      lastShelves = key;
      options.onShelfAnchors({ left, right });
    }
  };

  let lastAnchor = "";
  const reportHover = () => {
    const c = hovered !== null ? cases[hovered] : null;
    let point: { x: number; y: number } | null = null;
    if (c && c.u === 0 && c.hover > 0.5) {
      corner.set(0, 0, 0).applyMatrix4(c.group.matrixWorld).project(camera);
      point = { x: ((corner.x + 1) / 2) * width, y: ((1 - corner.y) / 2) * height };
    }
    const key = point ? `${Math.round(point.x)},${Math.round(point.y)}` : "";
    if (key !== lastAnchor) {
      lastAnchor = key;
      options.onHoverAnchor(point);
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const moving = step(dt);
    renderer.render(scene, camera);
    reportScreen();
    reportHover();
    reportShelves();
    if (moving) invalidate();
    else last = 0;
  };

  const invalidate = () => {
    if (!raf && active && !disposed) raf = requestAnimationFrame(frame);
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const onLost = (event: Event) => {
    event.preventDefault();
    options.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    setProgress(value) {
      const next = clamp01(value);
      if (next === progress) return;
      progress = next;
      invalidate();
    },
    setLayout(value) {
      if (value === layout) return;
      layout = value;
      view = null;
      invalidate();
    },
    setReduced(value) {
      reduced = value;
      invalidate();
    },
    setPointer(x, y) {
      pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
      invalidate();
    },
    pick(x, y, radius = 0) {
      ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (hit) {
        const index = hit.object.userData.index as number;
        return cases[index].u === 0 ? index : null;
      }
      if (radius <= 0) return null;
      let best: number | null = null;
      let bestD = radius;
      cases.forEach((c, i) => {
        if (c.u !== 0) return;
        corner.set(0, CASE_H / 2, 0).applyMatrix4(c.group.matrixWorld).project(camera);
        const d = Math.hypot(((corner.x + 1) / 2) * width - x, ((1 - corner.y) / 2) * height - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    },
    setHover(index) {
      if (index === hovered) return;
      hovered = index;
      invalidate();
    },
    nudge(index) {
      const c = cases[index];
      if (!c || reduced || c.u !== 0 || c.target !== 0) return;
      c.nudge = 0;
      invalidate();
    },
    view(on, arrive) {
      if (on) {
        viewing = true;
        viewFrom = view ? (view.slice() as Pose) : null;
        viewT = reduced ? 1 : 0;
        onArrive = arrive ?? null;
      } else {
        viewing = false;
        onArrive = null;
      }
      invalidate();
    },
    acknowledge() {
      if (reduced) return;
      ledPulse = 1;
      invalidate();
    },
    select(index, instant = false) {
      if (index === selected) return;
      selected = index;
      cases.forEach((c, i) => {
        c.target = i === index ? 1 : 0;
        if (instant) c.u = c.target;
      });
      if (instant && index !== null) {
        screenEpisode = null;
        raise = 0;
        step(0); // swaps the image in while the screen is down
        raise = 1;
      }
      invalidate();
    },
    resize(w, h) {
      if (w <= 0 || h <= 0) return;
      width = w;
      height = h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, layout === "tall" ? 1.75 : 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      invalidate();
    },
    setActive(value) {
      active = value;
      if (active) invalidate();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      screenTex?.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
