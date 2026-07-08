const COS_IMAGE_HOST_SUFFIX = '.myqcloud.com';
const IMAGE_EXTENSION_RE = /\.(avif|gif|jpe?g|png|webp)$/i;

export const COVER_WIDTHS = [480, 720, 1080, 1440];
export const THUMBNAIL_WIDTHS = [360, 520, 720];

export function isCosImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(COS_IMAGE_HOST_SUFFIX) && IMAGE_EXTENSION_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function buildCosImageUrl(url, width, quality = 80) {
  if (!isCosImageUrl(url)) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}imageMogr2/thumbnail/${width}x/format/webp/strip/rquality/${quality}`;
}

export function buildCosImageSet(url, widths = COVER_WIDTHS, quality = 80) {
  if (!isCosImageUrl(url)) return null;
  return Object.fromEntries(
    widths.map((width) => [String(width), buildCosImageUrl(url, width, quality)]),
  );
}

export function imageSetToSrcSet(imageSet) {
  if (!imageSet) return undefined;
  return Object.entries(imageSet)
    .map(([width, url]) => `${url} ${width}w`)
    .join(', ');
}

export function getResponsiveImageProps({
  src,
  imageSet,
  widths = COVER_WIDTHS,
  quality = 80,
  sizes,
} = {}) {
  const resolvedSet = imageSet ?? buildCosImageSet(src, widths, quality);
  if (!resolvedSet) return { src, sizes };

  const fallbackWidth = String(widths[Math.min(1, widths.length - 1)]);
  return {
    src: resolvedSet[fallbackWidth] ?? src,
    srcSet: imageSetToSrcSet(resolvedSet),
    sizes,
  };
}
