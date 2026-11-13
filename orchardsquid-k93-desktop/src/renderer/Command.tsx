export function Command({ children }: { children: string }) {
  return (
    <code
      className="my-1.5 block rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono
        text-xs font-normal break-all select-all dark:bg-zinc-900"
    >
      {children}
    </code>
  );
}
