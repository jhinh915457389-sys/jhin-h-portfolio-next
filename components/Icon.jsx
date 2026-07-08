export const ICON_SIZES = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
};

export function AppIcon({
  icon: Icon,
  size = 'sm',
  strokeWidth = 1.8,
  decorative = true,
  className = '',
  ...props
}) {
  if (!Icon) return null;
  const pixelSize = ICON_SIZES[size] ?? size;

  return (
    <Icon
      className={`app-icon ${className}`.trim()}
      size={pixelSize}
      strokeWidth={strokeWidth}
      aria-hidden={decorative ? 'true' : undefined}
      focusable="false"
      {...props}
    />
  );
}
