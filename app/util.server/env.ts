import assert from "assert";

export function requireEnv(name: string): string {
  const value = process.env[name];
  assert(value, `Environment variable "${name}" is not defined`);
  return value;
}
