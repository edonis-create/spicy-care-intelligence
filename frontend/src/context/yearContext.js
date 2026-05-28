import { createContext, useContext } from "react";

export const YearContext = createContext(null);

export function useYear() {
  const context = useContext(YearContext);

  if (!context) {
    throw new Error("useYear must be used inside YearProvider.");
  }

  return context;
}
