import { ASOIAF } from "./asoiaf";
import { DUNE } from "./dune";
import { MIDDLE_EARTH } from "./middleearth";
import type { UniverseData } from "./types";

export const UNIVERSES: UniverseData[] = [ASOIAF, MIDDLE_EARTH, DUNE];
export const universeById = (id?: string) => UNIVERSES.find((u) => u.id === id);
export type { UniverseData, UTopic, UBook, USection } from "./types";
