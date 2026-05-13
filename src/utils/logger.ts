export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(format('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    console.error(format('error', message, meta));
  },
};

function format(level: string, message: string, meta?: unknown): string {
  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta === undefined) return prefix;
  return `${prefix} ${JSON.stringify(meta)}`;
}
