import { useContext } from "react";
import { DeveloperModeReactContext, type DeveloperModeContextValue } from "./DeveloperModeReactContext";

export function useDeveloperMode(): DeveloperModeContextValue {
  const value = useContext(DeveloperModeReactContext);
  if (!value) throw new Error("useDeveloperMode must be used within a DeveloperModeProvider");
  return value;
}
