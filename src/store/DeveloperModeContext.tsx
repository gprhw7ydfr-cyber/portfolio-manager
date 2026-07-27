import { useEffect, useState, type ReactNode } from "react";
import { DeveloperModeReactContext } from "./DeveloperModeReactContext";

const DEVELOPER_MODE_STORAGE_KEY = "portfolio-manager:developerMode";

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const [developerMode, setDeveloperMode] = useState<boolean>(() => localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, String(developerMode));
  }, [developerMode]);

  return (
    <DeveloperModeReactContext.Provider value={[developerMode, setDeveloperMode]}>
      {children}
    </DeveloperModeReactContext.Provider>
  );
}
