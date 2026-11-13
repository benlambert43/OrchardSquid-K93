let running = false;

export async function exclusively<Result>(
  run: () => Promise<Result>,
): Promise<Result | { state: "busy" }> {
  if (running) {
    return { state: "busy" };
  }
  running = true;
  try {
    return await run();
  } finally {
    running = false;
  }
}
