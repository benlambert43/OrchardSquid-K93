export function contentSecurityPolicy({
  devServer,
}: {
  devServer: boolean;
}): string {
  return [
    `default-src 'self'${devServer ? " 'unsafe-inline'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
