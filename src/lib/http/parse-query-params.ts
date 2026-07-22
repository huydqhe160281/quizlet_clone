export function parseQueryParams(req: Request) {
  return Object.fromEntries(new URL(req.url).searchParams.entries());
}
