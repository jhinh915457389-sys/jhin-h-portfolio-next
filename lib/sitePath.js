const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function withBasePath(value) {
  if (
    !value
    || typeof value !== 'string'
    || !value.startsWith('/')
    || value.startsWith('//')
  ) {
    return value;
  }

  return `${basePath}${value}`;
}

export function withBasePathDeep(value) {
  if (Array.isArray(value)) return value.map((entry) => withBasePathDeep(entry));
  if (!value || typeof value !== 'object') return withBasePath(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, withBasePathDeep(entry)]),
  );
}
