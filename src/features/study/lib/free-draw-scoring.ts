export const FREE_DRAW_INK_ALPHA = 128;
export const FREE_DRAW_MIN_INK_PIXELS = 60;
export const FREE_DRAW_MIN_COVERAGE = 0.32;
export const FREE_DRAW_MIN_PRECISION = 0.55;
export const FREE_DRAW_MIN_STRICT_PRECISION = 0.12;
export const FREE_DRAW_MAX_OUTSIDE_RATIO = 0.22;
export const FREE_DRAW_MAX_AVG_DISTANCE = 6.4;
export const FREE_DRAW_MAX_INK_FACTOR = 5.3;
export const FREE_DRAW_MIN_INK_FACTOR = 0.35;
export const FREE_DRAW_MATCH_DISTANCE = 6;
export const FREE_DRAW_STRICT_DISTANCE = 4;
export const FREE_DRAW_COVER_DISTANCE = 8;
export const FREE_DRAW_OUTSIDE_DISTANCE = 14;
export const FREE_DRAW_NORMALIZED_SIZE = 64;
export const FREE_DRAW_NORMALIZED_PADDING = 3;
export const FREE_DRAW_MIN_NORMALIZED_IOU = 0.12;
export const FREE_DRAW_MIN_NORMALIZED_F1 = 0.28;
export const FREE_DRAW_MIN_QUALITY_SCORE = 0.48;

export type FreeDrawScoreResult = {
  passed: boolean;
  coverage: number;
  precision: number;
  strictPrecision: number;
  outsideRatio: number;
  averageDistance: number;
  inkFactor: number;
  normalizedIou: number;
  normalizedF1: number;
  userInk: number;
  reason: string | null;
};

const referenceFontSize = (character: string): number => {
  const length = [...character].length;
  if (length <= 1) {
    return 96;
  }
  if (length <= 3) {
    return 72;
  }
  return Math.max(40, Math.floor(220 / length));
};

export const renderReferenceMask = (character: string, size: number): Uint8Array | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const display = character.trim() || character;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${referenceFontSize(display)}px "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif`;
  ctx.fillText(display, size / 2, size / 2);

  const { data } = ctx.getImageData(0, 0, size, size);
  const mask = new Uint8Array(size * size);
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = data[i * 4 + 3] >= FREE_DRAW_INK_ALPHA ? 1 : 0;
  }

  return mask;
};

export const maskFromImageData = (imageData: ImageData): Uint8Array => {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = data[i * 4 + 3] >= FREE_DRAW_INK_ALPHA ? 1 : 0;
  }
  return mask;
};

export const dilateMask = (
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array => {
  const out = new Uint8Array(mask.length);
  const r2 = radius * radius;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] === 0) {
        continue;
      }
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > r2) {
            continue;
          }
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          out[ny * width + nx] = 1;
        }
      }
    }
  }

  return out;
};

const neighborOffsets = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

const buildDistanceMap = (mask: Uint8Array, width: number, height: number): Uint16Array | null => {
  const queueX = new Uint16Array(width * height);
  const queueY = new Uint16Array(width * height);
  const distances = new Uint16Array(width * height);
  const maxDistance = width + height;
  distances.fill(maxDistance);

  let head = 0;
  let tail = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] === 1) {
        distances[index] = 0;
        queueX[tail] = x;
        queueY[tail] = y;
        tail += 1;
      }
    }
  }

  if (tail === 0) {
    return null;
  }

  while (head < tail) {
    const x = queueX[head]!;
    const y = queueY[head]!;
    head += 1;

    const currentDistance = distances[y * width + x]!;

    for (const [dx, dy] of neighborOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const nIndex = ny * width + nx;
      const nextDistance = currentDistance + 1;
      if (nextDistance < distances[nIndex]!) {
        distances[nIndex] = nextDistance;
        queueX[tail] = nx;
        queueY[tail] = ny;
        tail += 1;
      }
    }
  }

  return distances;
};

export const extractBoundaryMask = (
  mask: Uint8Array,
  width: number,
  height: number
): Uint8Array => {
  const boundary = new Uint8Array(mask.length);
  const offsets = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] === 0) {
        continue;
      }

      const touchesOutside = offsets.some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx < 0 || ny < 0 || nx >= width || ny >= height || mask[ny * width + nx] === 0;
      });

      if (touchesOutside) {
        boundary[index] = 1;
      }
    }
  }

  return boundary;
};

const countOnes = (mask: Uint8Array): number => mask.reduce((total, value) => total + value, 0);

type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };

const boundingBoxFromMask = (
  mask: Uint8Array,
  width: number,
  height: number
): BoundingBox | null => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) {
        continue;
      }
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }

  return maxX < 0 || maxY < 0 ? null : { minX, minY, maxX, maxY };
};

const normalizeMask = (
  mask: Uint8Array,
  width: number,
  height: number,
  size: number,
  padding: number
): Uint8Array | null => {
  const box = boundingBoxFromMask(mask, width, height);
  if (!box) {
    return null;
  }

  const normalized = new Uint8Array(size * size);
  const sourceWidth = Math.max(box.maxX - box.minX + 1, 1);
  const sourceHeight = Math.max(box.maxY - box.minY + 1, 1);
  const available = Math.max(size - padding * 2 - 1, 1);
  const scale = Math.min(available / sourceWidth, available / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const offsetX = Math.floor((size - scaledWidth) / 2);
  const offsetY = Math.floor((size - scaledHeight) / 2);

  for (let y = box.minY; y <= box.maxY; y += 1) {
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (mask[y * width + x] === 0) {
        continue;
      }

      const nx = Math.round((x - box.minX) * scale) + offsetX;
      const ny = Math.round((y - box.minY) * scale) + offsetY;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
        continue;
      }
      normalized[ny * size + nx] = 1;
    }
  }

  return normalized;
};

const normalizedShapeScore = (
  userMask: Uint8Array,
  targetMask: Uint8Array,
  width: number,
  height: number
): { iou: number; f1: number } => {
  const userBoundary = extractBoundaryMask(userMask, width, height);
  const targetBoundary = extractBoundaryMask(targetMask, width, height);

  const userNormalized = normalizeMask(
    userBoundary,
    width,
    height,
    FREE_DRAW_NORMALIZED_SIZE,
    FREE_DRAW_NORMALIZED_PADDING
  );
  const targetNormalized = normalizeMask(
    targetBoundary,
    width,
    height,
    FREE_DRAW_NORMALIZED_SIZE,
    FREE_DRAW_NORMALIZED_PADDING
  );

  if (!userNormalized || !targetNormalized) {
    return { iou: 0, f1: 0 };
  }

  let intersection = 0;
  let union = 0;
  let userCount = 0;
  let targetCount = 0;
  for (let i = 0; i < userNormalized.length; i += 1) {
    const u = userNormalized[i]!;
    const t = targetNormalized[i]!;
    if (u === 1) {
      userCount += 1;
    }
    if (t === 1) {
      targetCount += 1;
    }
    if (u === 1 || t === 1) {
      union += 1;
    }
    if (u === 1 && t === 1) {
      intersection += 1;
    }
  }

  if (union === 0 || userCount === 0 || targetCount === 0) {
    return { iou: 0, f1: 0 };
  }

  const precision = intersection / userCount;
  const recall = intersection / targetCount;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { iou: intersection / union, f1 };
};

export const scoreFreeDrawMatch = (
  userMask: Uint8Array,
  referenceMask: Uint8Array,
  width: number,
  height: number
): FreeDrawScoreResult => {
  const userInk = countOnes(userMask);
  const strokeTarget = extractBoundaryMask(referenceMask, width, height);
  const refInk = countOnes(strokeTarget);

  if (userInk < FREE_DRAW_MIN_INK_PIXELS) {
    return {
      passed: false,
      coverage: 0,
      precision: 0,
      strictPrecision: 0,
      outsideRatio: 1,
      averageDistance: 999,
      inkFactor: 0,
      normalizedIou: 0,
      normalizedF1: 0,
      userInk,
      reason: 'Hãy vẽ ký tự trước khi bấm Xong.',
    };
  }

  if (refInk === 0) {
    return {
      passed: false,
      coverage: 0,
      precision: 0,
      strictPrecision: 0,
      outsideRatio: 1,
      averageDistance: 999,
      inkFactor: 0,
      normalizedIou: 0,
      normalizedF1: 0,
      userInk,
      reason: 'Không tạo được mẫu ký tự để so sánh.',
    };
  }

  const distanceToTarget = buildDistanceMap(strokeTarget, width, height);
  const distanceToUser = buildDistanceMap(userMask, width, height);
  if (!distanceToTarget || !distanceToUser) {
    return {
      passed: false,
      coverage: 0,
      precision: 0,
      strictPrecision: 0,
      outsideRatio: 1,
      averageDistance: 999,
      inkFactor: 0,
      normalizedIou: 0,
      normalizedF1: 0,
      userInk,
      reason: 'Không thể so khớp nét vẽ với mẫu. Hãy thử lại.',
    };
  }

  let inkOnTarget = 0;
  let strictInkOnTarget = 0;
  let inkOutside = 0;
  let distanceSum = 0;
  for (let i = 0; i < userMask.length; i += 1) {
    if (userMask[i] === 0) {
      continue;
    }

    const distance = distanceToTarget[i]!;
    distanceSum += distance;

    if (distance <= FREE_DRAW_MATCH_DISTANCE) {
      inkOnTarget += 1;
    }
    if (distance <= FREE_DRAW_STRICT_DISTANCE) {
      strictInkOnTarget += 1;
    }
    if (distance > FREE_DRAW_OUTSIDE_DISTANCE) {
      inkOutside += 1;
    }
  }

  let coveredReference = 0;
  for (let i = 0; i < strokeTarget.length; i += 1) {
    if (strokeTarget[i] === 1 && distanceToUser[i]! <= FREE_DRAW_COVER_DISTANCE) {
      coveredReference += 1;
    }
  }

  const precision = inkOnTarget / userInk;
  const strictPrecision = strictInkOnTarget / userInk;
  const coverage = coveredReference / refInk;
  const outsideRatio = inkOutside / userInk;
  const averageDistance = distanceSum / userInk;
  const inkFactor = userInk / refInk;
  const { iou: normalizedIou, f1: normalizedF1 } = normalizedShapeScore(
    userMask,
    strokeTarget,
    width,
    height
  );

  if (inkFactor > FREE_DRAW_MAX_INK_FACTOR || inkFactor < FREE_DRAW_MIN_INK_FACTOR) {
    return {
      passed: false,
      coverage,
      precision,
      strictPrecision,
      outsideRatio,
      averageDistance,
      inkFactor,
      normalizedIou,
      normalizedF1,
      userInk,
      reason: 'Độ đậm nét vẽ chưa hợp lý so với mẫu. Hãy viết gần giống kích thước ký tự.',
    };
  }

  if (outsideRatio > FREE_DRAW_MAX_OUTSIDE_RATIO * 1.6) {
    return {
      passed: false,
      coverage,
      precision,
      strictPrecision,
      outsideRatio,
      averageDistance,
      inkFactor,
      normalizedIou,
      normalizedF1,
      userInk,
      reason: 'Nét vẽ chưa khớp mẫu — thử vẽ đúng hình ký tự hơn.',
    };
  }

  const distanceScore = Math.max(0, 1 - averageDistance / (FREE_DRAW_MAX_AVG_DISTANCE * 1.25));
  const qualityScore =
    normalizedF1 * 0.35 +
    normalizedIou * 0.2 +
    precision * 0.2 +
    coverage * 0.15 +
    distanceScore * 0.1;

  const goodSignals =
    Number(precision >= FREE_DRAW_MIN_PRECISION) +
    Number(strictPrecision >= FREE_DRAW_MIN_STRICT_PRECISION) +
    Number(coverage >= FREE_DRAW_MIN_COVERAGE) +
    Number(outsideRatio <= FREE_DRAW_MAX_OUTSIDE_RATIO) +
    Number(averageDistance <= FREE_DRAW_MAX_AVG_DISTANCE) +
    Number(normalizedIou >= FREE_DRAW_MIN_NORMALIZED_IOU) +
    Number(normalizedF1 >= FREE_DRAW_MIN_NORMALIZED_F1);

  if (qualityScore < FREE_DRAW_MIN_QUALITY_SCORE && goodSignals < 3) {
    return {
      passed: false,
      coverage,
      precision,
      strictPrecision,
      outsideRatio,
      averageDistance,
      inkFactor,
      normalizedIou,
      normalizedF1,
      userInk,
      reason: 'Nét vẽ chưa khớp mẫu — thử vẽ đúng hình ký tự hơn.',
    };
  }

  if (coverage < 0.18) {
    return {
      passed: false,
      coverage,
      precision,
      strictPrecision,
      outsideRatio,
      averageDistance,
      inkFactor,
      normalizedIou,
      normalizedF1,
      userInk,
      reason: 'Chưa phủ đủ nét của ký tự — hãy vẽ lại.',
    };
  }

  return {
    passed: true,
    coverage,
    precision,
    strictPrecision,
    outsideRatio,
    averageDistance,
    inkFactor,
    normalizedIou,
    normalizedF1,
    userInk,
    reason: null,
  };
};
