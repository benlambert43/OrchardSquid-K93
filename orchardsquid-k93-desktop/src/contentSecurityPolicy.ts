export function contentSecurityPolicy(
  apiBaseUrl: string,
  { devServer }: { devServer: boolean },
): string {
  return [
    `default-src 'self'${devServer ? " 'unsafe-inline'" : ""}`,
    `connect-src 'self' ${new URL(apiBaseUrl).origin}`,
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
