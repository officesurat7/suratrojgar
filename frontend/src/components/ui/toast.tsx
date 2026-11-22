"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button, Modal } from "./index";

type Toast = { id: number; tone: "success" | "error" | "info"; text: string };
interface Ctx {
  toast: (text: string, tone?: Toast["tone"]) => void;
  confirm: (opts: { title: string; text?: ReactNode; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
}
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [dlg, setDlg] = useState<null | { title: string; text?: ReactNode; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void }>(null);

  const toast = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, tone, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === "error" ? 7000 : 4500);
  }, []);
  const confirm = useCallback<Ctx["confirm"]>((opts) => new Promise((resolve) => setDlg({ ...opts, resolve })), []);
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };

  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${t.tone === "error" ? "bg-red-600" : t.tone === "info" ? "bg-ink" : "bg-accent-600"}`}>
            <span aria-hidden="true">{t.tone === "error" ? "⚠️" : t.tone === "info" ? "ℹ️" : "✓"}</span>
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
      <Modal open={!!dlg} onClose={() => close(false)} title={dlg?.title ?? ""} size="sm"
        footer={<><Button variant="outline" onClick={() => close(false)}>Cancel</Button><Button variant={dlg?.danger ? "danger" : "primary"} onClick={() => close(true)}>{dlg?.confirmLabel ?? "Confirm"}</Button></>}>
        <div className="text-sm text-slate-600">{dlg?.text}</div>
      </Modal>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c;
}
