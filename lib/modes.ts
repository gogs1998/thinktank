export type ModeId = "eco" | "budget" | "balanced" | "deluxe" | "council";

export type ModeConfig = {
  id: ModeId;
  label: string;
  temperature: number;
  maxTokens: number;
  cacheTtlMs: number;
};

export const MODES: Record<ModeId, ModeConfig> = {
  eco: {
    id: "eco",
    label: "Eco",
    temperature: 0.2,
    maxTokens: 160,
    cacheTtlMs: 15 * 60 * 1000,
  },
  budget: {
    id: "budget",
    label: "Budget",
    temperature: 0.5,
    maxTokens: 256,
    cacheTtlMs: 15 * 60 * 1000,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    temperature: 0.7,
    maxTokens: 400,
    cacheTtlMs: 10 * 60 * 1000,
  },
  deluxe: {
    id: "deluxe",
    label: "Deluxe",
    temperature: 0.8,
    maxTokens: 600,
    cacheTtlMs: 5 * 60 * 1000,
  },
  council: {
    id: "council",
    label: "Council",
    temperature: 0.7,
    maxTokens: 300,
    cacheTtlMs: 10 * 60 * 1000,
  },
};

export const DEFAULT_MODE: ModeId = "balanced";

export function getModeConfig(mode?: string | null): ModeConfig {
  const key = (mode || DEFAULT_MODE) as ModeId;
  return MODES[key] || MODES[DEFAULT_MODE];
}



