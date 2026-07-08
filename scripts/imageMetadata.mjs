import fs from 'node:fs';
import path from 'node:path';

export function getImageSize(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.png') return getPngSize(buffer);
  if (extension === '.jpg' || extension === '.jpeg') return getJpegSize(buffer);
  if (extension === '.webp') return getWebpSize(buffer);
  return null;
}

export function getPublicImageSize(projectRoot, url) {
  if (!url?.startsWith('/')) return null;
  const filePath = path.join(projectRoot, 'public', url);
  const size = getImageSize(filePath);
  return size ? { ...size, filePath } : null;
}

export function withLocalImageSize(projectRoot, entry, urlKey = 'url') {
  const size = getPublicImageSize(projectRoot, entry?.[urlKey]);
  if (!size) return entry;
  return {
    ...entry,
    width: size.width,
    height: size.height,
  };
}

function getPngSize(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegSize(buffer) {
  let offset = 2;
  if (buffer.readUInt16BE(0) !== 0xffd8) return null;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function getWebpSize(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  const chunkType = buffer.toString('ascii', 12, 16);
  if (chunkType === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}
