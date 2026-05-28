import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, getStatusWarning, getYears } from "../api";
import { YearContext } from "./yearContext";

const FALLBACK_YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017];

export function YearProvider({ children }) {
  const [years, setYears] = useState(FALLBACK_YEARS);
  const [selectedYear, setSelectedYear] = useState(2017);
  const [isLoadingYears, setIsLoadingYears] = useState(true);
  const [yearError, setYearError] = useState("");
  const [yearWarning, setYearWarning] = useState("");

  const applyYears = (availableYears) => {
    setYears(availableYears);
    setSelectedYear(availableYears[availableYears.length - 1] ?? 2017);
  };

  const retryYears = useCallback(async () => {
    setIsLoadingYears(true);
    setYearError("");

    try {
      const data = await getYears();
      applyYears(data.years?.length ? data.years : FALLBACK_YEARS);
      setYearWarning(getStatusWarning(data));
    } catch (error) {
      setYears(FALLBACK_YEARS);
      setYearError(getApiErrorMessage(error, "Unable to load available years."));
    } finally {
      setIsLoadingYears(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    getYears()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        applyYears(data.years?.length ? data.years : FALLBACK_YEARS);
        setYearWarning(getStatusWarning(data));
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setYears(FALLBACK_YEARS);
        setYearError(getApiErrorMessage(error, "Unable to load available years."));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingYears(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      years,
      selectedYear,
      setSelectedYear,
      isLoadingYears,
      yearError,
      yearWarning,
      retryYears,
    }),
    [years, selectedYear, isLoadingYears, yearError, yearWarning, retryYears],
  );

  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}
