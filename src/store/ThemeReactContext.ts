import { createContext, type Dispatch, type SetStateAction } from "react";

export type Theme = "light" | "dark";

export type ThemeContextValue = [Theme, Dispatch<SetStateAction<Theme>>];

export const ThemeReactContext = createContext<ThemeContextValue | undefined>(undefined);
