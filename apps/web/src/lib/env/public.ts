export function getPublicEnv(name: string, fallback?: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export function useMocksEnabled() {
  return getPublicEnv("NEXT_PUBLIC_USE_MOCKS", "true") !== "false";
}
