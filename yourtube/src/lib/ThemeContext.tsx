
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

export type ThemePreference = "auto" | "light" | "dark";

interface ThemeContextType {
    themePreference: ThemePreference;
    setThemePreference: (theme: ThemePreference) => void;
    activeTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getAutomaticTheme(): "light" | "dark" {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    return hour >= 10 && hour < 12 ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themePreference, setPreference] =
        useState<ThemePreference>("auto");
    const [activeTheme, setActiveTheme] =
        useState<"light" | "dark">("dark");
    const [ready, setReady] = useState(false);

    const applyTheme = useCallback((preference: ThemePreference) => {
        const nextTheme =
            preference === "auto" ? getAutomaticTheme() : preference;

        setActiveTheme(nextTheme);

        document.documentElement.classList.toggle(
            "dark",
            nextTheme === "dark"
        );
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("yourtube-theme");
        const preference: ThemePreference =
            saved === "light" || saved === "dark" || saved === "auto"
                ? saved
                : "auto";

        setPreference(preference);
        applyTheme(preference);
        setReady(true);

        // Recheck automatic theme when the minute changes.
        const timer = window.setInterval(() => {
            if (preference === "auto") {
                applyTheme("auto");
            }
        }, 60_000);

        return () => window.clearInterval(timer);
    }, [applyTheme]);

    const setThemePreference = useCallback(
        (preference: ThemePreference) => {
            localStorage.setItem("yourtube-theme", preference);
            setPreference(preference);
            applyTheme(preference);
        },
        [applyTheme]
    );

    return (
        <ThemeContext.Provider
            value={{ themePreference, setThemePreference, activeTheme }}
        >
            {ready ? children : <div className="min-h-screen bg-background" />}
        </ThemeContext.Provider>
    );
}

export function useThemePreference() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useThemePreference must be used inside ThemeProvider"
        );
    }

    return context;
}
