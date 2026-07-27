import { useContext } from "react";
import { ThemeReactContext, type ThemeContextValue } from "./ThemeReactContext";

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeReactContext);
  if (!value) throw new Error("useTheme must be used within a ThemeProvider");
  return value;
}
