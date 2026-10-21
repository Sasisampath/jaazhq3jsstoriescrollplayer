import * as THREE from "three";
import type { ConsoleMedia } from "@/data/media";

/* EpisodeCase — one physical case in the Stories console, built from a media
   entry (FIRST TAKE episodes and the other JazzHQ conversations alike).
   A printed insert (cover = the real thumbnail, a dark readable spine) inside
   a thin clear acrylic shell. Local frame: pivot on the bottom edge, cover
   facing +z, spine on −x. Every case on the console comes from this builder. */

export const CASE_W = 0.44;
export const CASE_H = 0.41;
export const CASE_T = 0.048;

export type Fonts = { display: string; mono: string };

export type EpisodeCase = {
  group: THREE.Group;
  /** The mesh to raycast against; carries `userData.index`. */
  pickMesh: THREE.Mesh;
};

type Shared = {
  insertGeo: THREE.BoxGeometry;
  shellGeo: THREE.BoxGeometry;
  shell: THREE.Material;
  edge: THREE.Material;
  back: THREE.Material;
};

type Track = <T extends { dispose(): void }>(item: T) => T;

/** Contain-fit an image into a box (never crops). */
export function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * r;
  const dh = img.naturalHeight * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

/** Cover: the thumbnail full width, then a dark band with kicker, title and byline. */
function coverCanvas(img: HTMLImageElement | null, item: ConsoleMedia, fonts: Fonts) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = Math.round((640 * CASE_H) / CASE_W);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#121116";
  ctx.fillRect(0, 0, c.width, c.height);
  const artH = Math.round((c.width * 9) / 16);
  if (img) drawContained(ctx, img, 0, 0, c.width, artH);
  const pad = 30;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8f8aff";
  ctx.font = `500 20px ${fonts.mono}`;
  ctx.fillText(item.kicker, pad, artH + 44);
  ctx.fillStyle = "#f4f2ee";
  ctx.font = `700 31px ${fonts.display}`;
  wrap(ctx, item.title, c.width - pad * 2, 2).forEach((l, i) => ctx.fillText(l, pad, artH + 88 + i * 38));
  ctx.fillStyle = "#9b98a3";
  ctx.font = `500 18px ${fonts.mono}`;
  const by = "BY JAZZHQ";
  ctx.fillText(by, c.width - pad - ctx.measureText(by).width, c.height - 24);
  const byline = item.guest ?? item.duration;
  ctx.fillStyle = "#c9c6cf";
  ctx.font = `500 21px ${fonts.display}`;
  ctx.fillText(byline, pad, c.height - 24);
  return c;
}

/** Spine: what you read while the case is stored. FIRST TAKE spines are
    dark and numbered; the other conversations are light and unnumbered. */
function spineCanvas(item: ConsoleMedia, fonts: Fonts) {
  const c = document.createElement("canvas");
  c.width = 72;
  c.height = Math.round((72 * CASE_H) / CASE_T);
  const ctx = c.getContext("2d")!;
  const dark = item.collection === "first-take";
  const g = ctx.createLinearGradient(0, 0, c.width, 0);
  g.addColorStop(0, dark ? "#17161b" : "#e4ded3");
  g.addColorStop(0.5, dark ? "#24232a" : "#f3efe7");
  g.addColorStop(1, dark ? "#17161b" : "#e4ded3");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const ink = dark ? "#f4f2ee" : "#26252a";
  let y = 30;
  if (item.spineMark) {
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = `700 34px ${fonts.display}`;
    ctx.fillText(item.spineMark, c.width / 2, 52);
    y = 66;
  }
  ctx.fillStyle = "#564ef0";
  ctx.fillRect(c.width / 2 - 12, y, 24, 4);
  ctx.save();
  ctx.translate(c.width / 2, y + 26);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "#d9d6de" : "#3a3840";
  ctx.font = `600 20px ${fonts.mono}`;
  ctx.fillText(dark ? "FIRST TAKE" : "CONVERSATIONS", 0, 0);
  ctx.fillStyle = dark ? "#8d8a95" : "#8a857c";
  ctx.font = `500 17px ${fonts.mono}`;
  ctx.fillText("JAZZHQ", c.height - (y + 26) - 96, 0);
  ctx.restore();
  return c;
}

/** Materials and geometry every case shares; create once per scene. */
export function createCaseShared(track: Track): Shared {
  const insertGeo = track(new THREE.BoxGeometry(CASE_W - 0.012, CASE_H - 0.01, CASE_T - 0.014));
  insertGeo.translate(0, CASE_H / 2, 0);
  const shellGeo = track(new THREE.BoxGeometry(CASE_W, CASE_H, CASE_T));
  shellGeo.translate(0, CASE_H / 2, 0);
  return {
    insertGeo,
    shellGeo,
    // Clear acrylic: mostly reflection, a touch of haze.
    shell: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
        roughness: 0.06,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        depthWrite: false,
      }),
    ),
    edge: track(new THREE.MeshStandardMaterial({ color: 0x1b1a1f, roughness: 0.5 })),
    back: track(new THREE.MeshStandardMaterial({ color: 0x24232a, roughness: 0.55 })),
  };
}

export function createEpisodeCase(options: {
  item: ConsoleMedia;
  index: number;
  image: HTMLImageElement | null;
  fonts: Fonts;
  shared: Shared;
  texture: (canvas: HTMLCanvasElement) => THREE.Texture;
  track: Track;
}): EpisodeCase {
  const { item, index, image, fonts, shared, texture, track } = options;
  const cover = track(new THREE.MeshStandardMaterial({ map: texture(coverCanvas(image, item, fonts)), roughness: 0.32 }));
  const spine = track(new THREE.MeshStandardMaterial({ map: texture(spineCanvas(item, fonts)), roughness: 0.4 }));
  // Faces: +x opening edge, −x spine, ±y, +z cover, −z back.
  const insert = new THREE.Mesh(shared.insertGeo, [shared.edge, spine, shared.edge, shared.edge, cover, shared.back]);
  insert.position.y = 0.005;
  insert.userData.index = index;
  const shell = new THREE.Mesh(shared.shellGeo, shared.shell);
  shell.renderOrder = 1;
  const group = new THREE.Group();
  group.add(insert, shell);
  return { group, pickMesh: insert };
}
