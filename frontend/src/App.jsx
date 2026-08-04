import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  Activity, BarChart3, Brain, FileArchive, GitFork, HeartPulse,
  LayoutDashboard, Menu, Microscope, Pill, Search, Settings as SettingsIcon,
  ShieldCheck, Target, TrendingUp, User, Users, X, Zap,
} from "lucide-react";
import { DataArtifacts } from "./pages/DataArtifacts";
import { CohortAnalysis } from "./pages/CohortAnalysis";
import { LongitudinalTransitions } from "./pages/LongitudinalTransitions";
import { Overview } from "./pages/Overview";
import { PatientTrajectory } from "./pages/PatientTrajectory";
import { PhenotypeExplorer } from "./pages/PhenotypeExplorer";
import { PopulationForecast } from "./pages/PopulationForecast";
import { SettingsPage } from "./pages/Settings";
import { YearlyStratification } from "./pages/YearlyStratification";
import { AppProviders as DiseaseProviders } from "./context/disease/AppProviders";
import { DashboardLayout as DiseaseDashboardLayout } from "./routes/DiseaseDashboardLayout";
import { HomePage as DiseaseHomePage } from "./pages/disease/HomePage";
import { PatientExplorerPage as DiseasePatientExplorerPage } from "./pages/disease/PatientExplorerPage";
import { InterventionPage as DiseaseInterventionPage } from "./pages/disease/InterventionPage";
import { AnalyticsPage as DiseaseAnalyticsPage } from "./pages/disease/AnalyticsPage";
import { GovernancePage as DiseaseGovernancePage } from "./pages/disease/GovernancePage";
import { TrainingPage as DiseaseTrainingPage } from "./pages/disease/TrainingPage";
import AdherenceDashboardPage from "./pages/adherence/DashboardPage";
import AdherenceExplorerPage from "./pages/adherence/ExplorerPage";
import AdherenceEvidencePage from "./pages/adherence/EvidencePage";
import AdherenceModelCardPage from "./pages/adherence/ModelCardPage";
import logo from "./assets/logo.svg";
import { Spinner } from "./components/Spinner";
import { Chatbot } from "./components/Chatbot";
import { StatusBanner } from "./components/StatusBanner";
import { useYear } from "./context/yearContext";
import { cn, PremiumDropdown } from "./components/ui";

const NAV_GROUPS = [
  {
    label: "Patient Stratification",
    items: [
      { label: "Dashboard",           path: "/overview",              icon: LayoutDashboard },
      { label: "Population Health",   path: "/yearly-stratification", icon: BarChart3 },
      { label: "Risk Tier Profiles",  path: "/phenotype-explorer",    icon: Activity },
      { label: "Risk Progression",    path: "/risk-progression",      icon: GitFork },
      { label: "Population Forecast", path: "/forecast",              icon: TrendingUp },
      { label: "Patient Groups",      path: "/cohort-analysis",       icon: Users },
      { label: "Patient Journey",     path: "/patient-trajectory",    icon: User },
    ],
  },
  {
    label: "Disease Prediction",
    items: [
      { label: "Overview",         path: "/disease",               icon: Brain },
      { label: "Patient Explorer", path: "/disease/patients",      icon: Search },
      { label: "Interventions",    path: "/disease/intervention",  icon: Target },
      { label: "Analytics",        path: "/disease/analytics",     icon: Microscope },
      { label: "Governance",       path: "/disease/governance",    icon: ShieldCheck },
      { label: "FL Training",      path: "/disease/training",      icon: Zap },
    ],
  },
  {
    label: "Drug Adherence",
    items: [
      { label: "Antihypertensives Overview", path: "/adherence/dashboard",   icon: HeartPulse },
      { label: "Patient Explorer", path: "/adherence/explorer",    icon: Search },
      { label: "FL Evidence",      path: "/adherence/evidence",    icon: GitFork },
      { label: "Model Card",       path: "/adherence/model-card",  icon: Pill },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Data Quality", path: "/data-quality", icon: FileArchive },
      { label: "Settings",     path: "/settings",     icon: SettingsIcon },
    ],
  },
];

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }, [pathname]);
  return null;
}

function NavItem({ to, icon: Icon, label, onNavigate }) {
  return (
    <NavLink to={to} end={to === "/disease"} onClick={onNavigate}
      className={({ isActive }) =>
        cn("group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition",
          isActive ? "text-fg-primary" : "text-fg-tertiary hover:text-fg-primary hover:bg-white/[0.04]")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-md" style={{
              background: "linear-gradient(180deg, rgba(255,42,42,0.12) 0%, rgba(255,42,42,0.03) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,42,42,0.20), inset 0 1px 0 rgba(255,255,255,0.06)",
            }} />
          )}
          <span aria-hidden className={cn("absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full transition-all",
            isActive ? "bg-accent shadow-[0_0_8px_var(--accent-glow)]" : "bg-transparent")} />
          <Icon className={cn("relative h-[15px] w-[15px] shrink-0 transition",
            isActive ? "text-accent" : "text-fg-quaternary group-hover:text-fg-secondary")} />
          <span className="relative truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ onNavigate }) {
  return (
    <nav className="flex h-full flex-col">
      <div className="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-quaternary">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} to={item.path} icon={item.icon} label={item.label} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

const YEAR_SWITCHER_SURFACE = {
  background: "linear-gradient(180deg, rgba(255,42,42,0.12) 0%, rgba(255,42,42,0.03) 100%)",
  boxShadow: "inset 0 0 0 1px rgba(255,42,42,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
};

function YearSwitcher() {
  const { years, selectedYear, setSelectedYear, isLoadingYears } = useYear();
  return (
    <div style={YEAR_SWITCHER_SURFACE} className="relative flex h-8 items-center gap-1.5 rounded-md border border-border-accent pl-2 pr-1 transition hover:border-accent hover:brightness-[1.04]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Year</span>
      <div className="h-3.5 w-px bg-[rgba(255,42,42,0.35)]" aria-hidden />
      <PremiumDropdown block={false} value={selectedYear} onChange={(v) => setSelectedYear(Number(v))}
        options={years.map((year) => ({ value: year, label: String(year) }))} disabled={isLoadingYears}
        listAriaLabel="Select year" chevronClassName="text-accent/75"
        triggerClassName="!h-8 !min-h-0 !rounded-[6px] !border-0 !bg-transparent !py-0 !shadow-none hover:!bg-white/[0.06] focus-visible:!ring-offset-0" />
      {isLoadingYears && (<div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"><Spinner size={3} /></div>)}
    </div>
  );
}

function App() {
  const { yearError, yearWarning, retryYears } = useYear();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);
  const mainGutterClass = "px-4 sm:px-6 lg:px-6";

  return (
    <div className="min-h-screen bg-bg-base text-fg-primary">
      <ScrollToTopOnRouteChange />
      <header className="sticky top-0 z-30 border-b border-border-default bg-surface-overlay backdrop-blur-xl shadow-sm">
        <div className={cn("flex h-[var(--header-h)] items-center justify-between gap-4", mainGutterClass)}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-default bg-surface-1 text-fg-secondary transition hover:border-border-strong hover:text-fg-primary lg:hidden"
              aria-label="Toggle navigation">
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <img src={logo} alt="" className="h-9 w-auto max-h-9 shrink-0 object-contain object-left opacity-95 sm:h-10 sm:max-h-10" />
              <div className="hidden min-w-0 flex-col justify-center gap-0 leading-tight sm:flex">
                <p className="text-[13px] font-semibold tracking-[-0.012em] text-fg-primary sm:text-[13.5px]">Spicy Care Intelligence</p>
                <p className="text-[10.5px] font-medium text-fg-tertiary sm:text-[11px]">Federated healthcare analytics</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2"><YearSwitcher /></div>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] shrink-0 border-r border-border-default bg-surface-overlay backdrop-blur-sm lg:block"
          style={{ width: "var(--sidebar-w)" }}>
          <Sidebar />
        </aside>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <div className="absolute inset-y-0 left-0 top-[var(--header-h)] h-[calc(100vh-var(--header-h))] w-[260px] border-r border-border-default bg-bg-canvas shadow-lg"
              onClick={(e) => e.stopPropagation()}>
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1">
          <div className={cn("mx-auto max-w-[1400px] py-6 lg:py-8", mainGutterClass)}>
            {yearError && (<div className="mb-5"><StatusBanner tone="error" message={yearError} actionLabel="Retry" onAction={retryYears} /></div>)}
            {!yearError && yearWarning && (<div className="mb-5"><StatusBanner tone="warning" message={yearWarning} /></div>)}
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/yearly-stratification" element={<YearlyStratification />} />
              <Route path="/phenotype-explorer" element={<PhenotypeExplorer />} />
              <Route path="/risk-progression" element={<LongitudinalTransitions />} />
              <Route path="/longitudinal-transitions" element={<Navigate to="/risk-progression" replace />} />
              <Route path="/forecast" element={<PopulationForecast />} />
              <Route path="/patient-trajectory" element={<PatientTrajectory />} />
              <Route path="/cohort-analysis" element={<CohortAnalysis />} />
              <Route path="/data-quality" element={<DataArtifacts />} />
              <Route path="/data-artifacts" element={<Navigate to="/data-quality" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/disease" element={<DiseaseProviders><DiseaseDashboardLayout /></DiseaseProviders>}>
                <Route index element={<DiseaseHomePage />} />
                <Route path="patients" element={<DiseasePatientExplorerPage />} />
                <Route path="intervention" element={<DiseaseInterventionPage />} />
                <Route path="analytics" element={<DiseaseAnalyticsPage />} />
                <Route path="governance" element={<DiseaseGovernancePage />} />
                <Route path="training" element={<DiseaseTrainingPage />} />
              </Route>
              <Route path="/adherence" element={<Navigate to="/adherence/dashboard" replace />} />
              <Route path="/adherence/dashboard" element={<AdherenceDashboardPage />} />
              <Route path="/adherence/explorer" element={<AdherenceExplorerPage />} />
              <Route path="/adherence/evidence" element={<AdherenceEvidencePage />} />
              <Route path="/adherence/model-card" element={<AdherenceModelCardPage />} />
            </Routes>
          </div>
        </main>
      </div>
      <Chatbot />
    </div>
  );
}

export default App;
