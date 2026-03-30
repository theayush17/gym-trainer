"use client";

import { Toaster } from "react-hot-toast";
import { useThemeContext } from "@/components/theme-provider";

export function AppToaster() {
  const { theme } = useThemeContext();
  const darkMode = theme === "dark";

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        duration: 3600,
        style: {
          background: darkMode ? "#111827" : "#ffffff",
          color: darkMode ? "#ffffff" : "#0f172a",
          border: `1px solid ${darkMode ? "#374151" : "#e2e8f0"}`,
          boxShadow: darkMode
            ? "0 20px 50px rgba(0, 0, 0, 0.35)"
            : "0 16px 40px rgba(15, 23, 42, 0.12)",
          borderRadius: "18px",
          padding: "14px 16px"
        },
        success: {
          iconTheme: {
            primary: "#22c55e",
            secondary: "#ffffff"
          }
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffffff"
          }
        },
        loading: {
          iconTheme: {
            primary: darkMode ? "#ffffff" : "#0f172a",
            secondary: darkMode ? "#111827" : "#ffffff"
          }
        }
      }}
    />
  );
}
