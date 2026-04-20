"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface Toast { id: number; message: string; type: "success" | "error"; }

interface ToastCtx { success: (msg: string) => void; error: (msg: string) => void; }

const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const add = useCallback((message: string, type: "success" | "error") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const success = useCallback((msg: string) => add(msg, "success"), [add]);
  const error = useCallback((msg: string) => add(msg, "error"), [add]);
  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto
              border backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in duration-200
              ${t.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800"
                : "bg-white border-red-200 text-red-800"}`}>
            {t.type === "success"
              ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
              : <XCircle size={15} className="text-red-500 flex-shrink-0" />}
            {t.message}
            <button onClick={() => dismiss(t.id)} className="ml-1 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
