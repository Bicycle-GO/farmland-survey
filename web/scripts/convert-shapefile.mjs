import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(
  scriptDirectory,
  '../../shape file/농지전수조사.shp',
);
const outputPath = resolve(
  scriptDirectory,
  '../data/farmland-boundaries.json',
);

// EPSG:5186 — Korea 2000 / Central Belt 2010.
const semiMajorAxis = 6_378_137;
const flattening = 1 / 298.257222101;
const eccentricitySquared = 2 * flattening - flattening * flattening;
const secondEccentricitySquared =
  eccentricitySquared / (1 - eccentricitySquared);
const centralMeridian = degreesToRadians(127);
const latitudeOfOrigin = degreesToRadians(38);
const falseEasting = 200_000;
const falseNorthing = 600_000;
const scaleFactor = 1;

const meridionalOrigin = meridionalArc(latitudeOfOrigin);

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

function meridionalArc(latitude) {
  const e2 = eccentricitySquared;
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  return (
    semiMajorAxis *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latitude -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) *
        Math.sin(2 * latitude) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latitude) -
      ((35 * e6) / 3072) * Math.sin(6 * latitude))
  );
}

function inverseKoreaCentralBelt(easting, northing) {
  const e2 = eccentricitySquared;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const meridional =
    meridionalOrigin + (northing - falseNorthing) / scaleFactor;
  const footprintBase =
    meridional /
    (semiMajorAxis *
      (1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256));

  const footprintLatitude =
    footprintBase +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) *
      Math.sin(2 * footprintBase) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) *
      Math.sin(4 * footprintBase) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * footprintBase) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * footprintBase);

  const sinFootprint = Math.sin(footprintLatitude);
  const cosFootprint = Math.cos(footprintLatitude);
  const tangentSquared = Math.tan(footprintLatitude) ** 2;
  const curvature =
    semiMajorAxis / Math.sqrt(1 - e2 * sinFootprint * sinFootprint);
  const radius =
    (semiMajorAxis * (1 - e2)) /
    (1 - e2 * sinFootprint * sinFootprint) ** 1.5;
  const c = secondEccentricitySquared * cosFootprint * cosFootprint;
  const d = (easting - falseEasting) / (curvature * scaleFactor);

  const latitude =
    footprintLatitude -
    ((curvature * Math.tan(footprintLatitude)) / radius) *
      (d ** 2 / 2 -
        ((5 + 3 * tangentSquared + 10 * c - 4 * c ** 2 - 9 * secondEccentricitySquared) *
          d ** 4) /
          24 +
        ((61 +
          90 * tangentSquared +
          298 * c +
          45 * tangentSquared ** 2 -
          252 * secondEccentricitySquared -
          3 * c ** 2) *
          d ** 6) /
          720);

  const longitude =
    centralMeridian +
    (d -
      ((1 + 2 * tangentSquared + c) * d ** 3) / 6 +
      ((5 -
        2 * c +
        28 * tangentSquared -
        3 * c ** 2 +
        8 * secondEccentricitySquared +
        24 * tangentSquared ** 2) *
        d ** 5) /
        120) /
      cosFootprint;

  return [
    Number(radiansToDegrees(longitude).toFixed(7)),
    Number(radiansToDegrees(latitude).toFixed(7)),
  ];
}

function readPolygonRecords(buffer) {
  if (buffer.length < 100 || buffer.readInt32BE(0) !== 9994) {
    throw new Error('올바른 Shapefile 헤더가 아닙니다.');
  }

  const declaredBytes = buffer.readInt32BE(24) * 2;
  if (declaredBytes > buffer.length) {
    throw new Error('Shapefile 길이 정보가 실제 파일보다 큽니다.');
  }

  const headerShapeType = buffer.readInt32LE(32);
  if (headerShapeType !== 5) {
    throw new Error(`Polygon Shapefile이 아닙니다. shapeType=${headerShapeType}`);
  }

  const lines = [];
  let recordCount = 0;
  let pointCount = 0;
  let offset = 100;

  while (offset + 8 <= declaredBytes) {
    const contentLength = buffer.readInt32BE(offset + 4) * 2;
    const contentOffset = offset + 8;
    const nextOffset = contentOffset + contentLength;

    if (contentLength < 4 || nextOffset > declaredBytes) {
      throw new Error(`손상된 레코드가 있습니다. byteOffset=${offset}`);
    }

    const shapeType = buffer.readInt32LE(contentOffset);
    if (shapeType === 0) {
      offset = nextOffset;
      continue;
    }
    if (shapeType !== 5 || contentLength < 44) {
      throw new Error(`지원하지 않는 레코드 형식입니다. shapeType=${shapeType}`);
    }

    const partCount = buffer.readInt32LE(contentOffset + 36);
    const recordPointCount = buffer.readInt32LE(contentOffset + 40);
    const partsOffset = contentOffset + 44;
    const pointsOffset = partsOffset + partCount * 4;

    if (
      partCount < 1 ||
      recordPointCount < 2 ||
      pointsOffset + recordPointCount * 16 > nextOffset
    ) {
      throw new Error(`유효하지 않은 Polygon 레코드입니다. record=${recordCount + 1}`);
    }

    const partStarts = [];
    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      partStarts.push(buffer.readInt32LE(partsOffset + partIndex * 4));
    }
    partStarts.push(recordPointCount);

    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      const start = partStarts[partIndex];
      const end = partStarts[partIndex + 1];
      if (start < 0 || end > recordPointCount || end - start < 2) {
        throw new Error(`유효하지 않은 part 인덱스입니다. record=${recordCount + 1}`);
      }

      const line = [];
      for (let pointIndex = start; pointIndex < end; pointIndex += 1) {
        const pointOffset = pointsOffset + pointIndex * 16;
        const easting = buffer.readDoubleLE(pointOffset);
        const northing = buffer.readDoubleLE(pointOffset + 8);
        line.push(inverseKoreaCentralBelt(easting, northing));
      }
      lines.push(line);
      pointCount += line.length;
    }

    recordCount += 1;
    offset = nextOffset;
  }

  return { lines, pointCount, recordCount };
}

function getBounds(lines) {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const line of lines) {
    for (const [longitude, latitude] of line) {
      west = Math.min(west, longitude);
      south = Math.min(south, latitude);
      east = Math.max(east, longitude);
      north = Math.max(north, latitude);
    }
  }

  return [west, south, east, north];
}

const source = await readFile(sourcePath);
const { lines, pointCount, recordCount } = readPolygonRecords(source);
const output = {
  type: 'FarmlandBoundaryCollection',
  crs: 'EPSG:4326',
  sourceCrs: 'EPSG:5186',
  recordCount,
  partCount: lines.length,
  pointCount,
  bounds: getBounds(lines),
  lines,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(output));

console.log(
  JSON.stringify(
    {
      output: outputPath,
      recordCount,
      partCount: lines.length,
      pointCount,
      bounds: output.bounds,
    },
    null,
    2,
  ),
);
