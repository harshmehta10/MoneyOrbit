import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addMonths } from "../lib/format.js";
import {
  X,
  CircleNotch,
  WarningCircle,
  Tray,
  CaretLeft,
  CaretRight,
  Eye,
  EyeSlash,
  CaretDown,
} from '@icons';

export function useLoad(fn, deps = []) {
  const [state, set] = useState({ data: null, loading: true, error: "" });
  const run = useCallback(() => {
    set((s) => ({ ...s, loading: true, error: "" }));
    return fn().then(
      (data) => set({ data, loading: false, error: "" }),
      (e) => set({ data: null, loading: false, error: e.message }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run };
}

const btn = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary:
    "bg-white text-stone-700 border border-stone-300 hover:bg-stone-100",
  danger: "bg-clay-600 text-white hover:bg-clay-700",
  ghost: "text-stone-600 hover:bg-stone-100",
};
export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  ...p
}) {
  return (
    <button
      {...p}
      disabled={loading || p.disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50 ${btn[variant]} ${className}`}
    >
      {loading && <CircleNotch className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

const field =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100";
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-stone-600">{hint}</span>
      )}
    </label>
  );
}
export const Input = ({ label, hint, ...p }) => (
  <Field label={label} hint={hint}>
    <input {...p} className={field} />
  </Field>
);
export function PasswordInput({ label, hint, ...p }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          {...p}
          type={show ? "text" : "password"}
          className={`${field} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 grid size-11 place-items-center rounded-xl text-stone-600 hover:text-stone-900"
        >
          {show ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </Field>
  );
}
// appearance-none + our own caret so the arrow has breathing room (the native one hugs the edge)
export const Select = ({ label, hint, children, ...p }) => (
  <Field label={label} hint={hint}>
    <div className="relative">
      <select {...p} className={`${field} appearance-none truncate pr-10`}>
        {children}
      </select>
      <CaretDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-stone-600" />
    </div>
  </Field>
);

export const Card = ({ className = "", children }) => (
  <div
    className={`rounded-2xl bg-white p-4 shadow-3d ring-1 ring-stone-200/60 sm:p-5 ${className}`}
  >
    {children}
  </div>
);

export function Alert({ children, tone = "error" }) {
  if (!children) return null;
  const c =
    tone === "error"
      ? "bg-clay-50 text-clay-800 border-clay-200"
      : "bg-sand-50 text-sand-900 border-sand-200";
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${c}`}
    >
      <WarningCircle className="mt-0.5 size-4 shrink-0" />{" "}
      <span>{children}</span>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  const box = useRef();
  const close = useRef(onClose);
  const opener = useRef(document.activeElement); // captured at first render, before autoFocus moves focus
  close.current = onClose;
  useEffect(() => {
    const el = box.current;
    if (!el.contains(document.activeElement)) el.focus();
    const onKey = (e) => {
      if (e.key === "Escape") return close.current();
      if (e.key !== "Tab") return;
      const f = [
        ...el.querySelectorAll(
          "a[href],button:not(:disabled),input:not(:disabled),select,textarea",
        ),
      ];
      if (!f.length) return e.preventDefault();
      const [first, last] = [f[0], f[f.length - 1]];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === el)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      opener.current?.focus?.();
    };
  }, []);
  // Portal to <body>: an animated (transformed) ancestor would otherwise trap `position: fixed` inside the page box
  return createPortal(
    <div
      className="fade fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 outline-none sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-lg hover:bg-stone-100"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const PageHeader = ({ title, sub, large, children }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <h1
        className={`font-serif font-semibold ${large ? "text-3xl leading-tight sm:text-4xl lg:text-5xl" : "truncate text-2xl sm:text-3xl"}`}
      >
        {title}
      </h1>
      {sub && (
        <p
          className={
            large
              ? "mt-1 text-base text-stone-600 sm:text-lg"
              : "text-sm text-stone-600"
          }
        >
          {sub}
        </p>
      )}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const Empty = ({ text, children }) => (
  <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-stone-600">
    <span className="grid size-14 place-items-center rounded-full bg-stone-100">
      <Tray className="size-6 text-stone-500" />
    </span>
    {text}
    {children}
  </div>
);

export function MonthNav({ month, onChange }) {
  const shift = (n) => onChange(addMonths(month, n));
  const label = new Date(month + "-01T00:00").toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-3d ring-1 ring-stone-200/60">
      <button
        onClick={() => shift(-1)}
        aria-label="Previous month"
        className="grid size-11 place-items-center rounded-xl hover:bg-stone-100"
      >
        <CaretLeft className="size-5" />
      </button>
      <span className="min-w-36 text-center text-sm font-semibold">
        {label}
      </span>
      <button
        onClick={() => shift(1)}
        aria-label="Next month"
        className="grid size-11 place-items-center rounded-xl hover:bg-stone-100"
      >
        <CaretRight className="size-5" />
      </button>
    </div>
  );
}

export const Skeleton = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-200/70" />
    ))}
  </div>
);

export function Status({ loading, error, children }) {
  if (loading) return <Skeleton />;
  if (error) return <Alert>{error}</Alert>;
  return children;
}

// Progress bar + text so alerts don't rely on colour alone (SRS 4.4).
export function BudgetBar({ spent, limit }) {
  const pct = Math.round((spent / limit) * 100);
  const tone =
    pct >= 100
      ? ["bg-clay-600", "Over budget"]
      : pct >= 80
        ? ["bg-sand-500", "Nearing limit"]
        : ["bg-sage-600", "On track"];
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`growX h-full rounded-full ${tone[0]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-stone-600">
        {pct}% used · {tone[1]}
      </p>
    </div>
  );
}
