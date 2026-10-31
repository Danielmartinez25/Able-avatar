import {
  BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  RepeatWrapping,
  Shape,
  Vector3,
} from "three";
export function createBodyGeometry() {
  const s = new Shape();
  s.moveTo(-0.73, -0.72);
  s.bezierCurveTo(-1.03, -0.73, -1.02, -0.45, -0.88, -0.12);
  s.lineTo(-0.29, 1.02);
  s.bezierCurveTo(-0.15, 1.32, 0.15, 1.32, 0.29, 1.02);
  s.lineTo(0.88, -0.12);
  s.bezierCurveTo(1.02, -0.45, 1.03, -0.73, 0.73, -0.72);
  s.lineTo(0.46, -0.72);
  s.bezierCurveTo(0.28, -0.72, 0.22, -0.36, 0, -0.36);
  s.bezierCurveTo(-0.22, -0.36, -0.28, -0.72, -0.46, -0.72);
  s.closePath();
  const g = new ExtrudeGeometry(s, {
    depth: 0.46,
    bevelEnabled: true,
    bevelSegments: 12,
    bevelSize: 0.16,
    bevelThickness: 0.25,
    curveSegments: 40,
    steps: 1,
  });
  g.translate(0, 0, -0.23);
  return g;
}
export function createScreenGeometry() {
  const s = new Shape();
  s.moveTo(-0.55, -0.2);
  s.bezierCurveTo(-0.82, -0.2, -0.68, 0.15, -0.48, 0.35);
  s.bezierCurveTo(-0.25, 0.57, 0.25, 0.57, 0.48, 0.35);
  s.bezierCurveTo(0.68, 0.15, 0.82, -0.2, 0.55, -0.2);
  s.quadraticCurveTo(0, -0.29, -0.55, -0.2);
  return new ExtrudeGeometry(s, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSize: 0.07,
    bevelThickness: 0.07,
    bevelSegments: 8,
    curveSegments: 40,
  });
}
function randomGenerator(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
/** Short deterministic surface fibers; no external asset or texture downloads. */
export function createFurGeometry(body: BufferGeometry, count = 18000) {
  const p = body.getAttribute("position"),
    n = body.getAttribute("normal");
  const areas: number[] = [],
    a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  let total = 0;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    total += b.sub(a).cross(c.sub(a)).length() * 0.5;
    areas.push(total);
  }
  const random = randomGenerator(42),
    vertices: number[] = [],
    point = new Vector3(),
    normal = new Vector3();
  for (let i = 0; i < count; i++) {
    const target = random() * total;
    let low = 0,
      high = areas.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (areas[mid] < target) low = mid + 1;
      else high = mid;
    }
    const index = low * 3,
      u = Math.sqrt(random()),
      v = random();
    a.fromBufferAttribute(p, index);
    b.fromBufferAttribute(p, index + 1);
    c.fromBufferAttribute(p, index + 2);
    point
      .copy(a)
      .multiplyScalar(1 - u)
      .addScaledVector(b, u * (1 - v))
      .addScaledVector(c, u * v);
    normal.fromBufferAttribute(n, index);
    vertices.push(point.x, point.y, point.z);
    point.addScaledVector(normal, 0.009 + random() * 0.016);
    vertices.push(
      point.x + (random() - 0.5) * 0.012,
      point.y + (random() - 0.5) * 0.012,
      point.z,
    );
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  return g;
}
export function createPlushTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!,
    random = randomGenerator(84);
  ctx.fillStyle = "#858585";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26000; i++) {
    const shade = 70 + Math.floor(random() * 135);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    const x = random() * 256,
      y = random() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 2, y + 1 + random() * 3);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(5, 5);
  return texture;
}
