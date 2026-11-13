const byteUnits = [
  { unit: "gigabyte", bytes: 1024 ** 3 },
  { unit: "megabyte", bytes: 1024 ** 2 },
  { unit: "kilobyte", bytes: 1024 },
];

const secondsPerMinute = 60;
const minutesPerHour = 60;
const minutesPerDay = 24 * minutesPerHour;

export function formatBytes(bytes: number): string {
  const { unit, bytes: unitBytes } = byteUnits.find(
    (candidate) => bytes >= candidate.bytes,
  ) ?? { unit: "byte", bytes: 1 };
  return new Intl.NumberFormat(undefined, {
    style: "unit",
    unit,
    maximumSignificantDigits: 3,
  }).format(bytes / unitBytes);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / secondsPerMinute);
  return new Intl.DurationFormat(undefined, {
    style: "short",
    minutesDisplay: "always",
  }).format({
    days: Math.floor(minutes / minutesPerDay),
    hours: Math.floor(minutes / minutesPerHour) % 24,
    minutes: minutes % minutesPerHour,
  });
}
