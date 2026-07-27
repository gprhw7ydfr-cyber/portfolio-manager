import { createContext, type Dispatch, type SetStateAction } from "react";

export type DeveloperModeContextValue = [boolean, Dispatch<SetStateAction<boolean>>];

export const DeveloperModeReactContext = createContext<DeveloperModeContextValue | undefined>(undefined);
