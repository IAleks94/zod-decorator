export function resolveBaseMsg(message: string | { base?: string } | undefined): { message: string } | undefined {
  const str = typeof message === "string" ? message : message?.base;
  return str ? { message: str } : undefined;
}

export function createMsgResolver<T extends object>(
  message: string | T | undefined,
): (key: keyof T) => string | undefined {
  if (message === undefined || typeof message === "string") {
    return () => undefined;
  }
  return (key: keyof T) => message[key] as string | undefined;
}
