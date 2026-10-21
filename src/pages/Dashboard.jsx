import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CaretRight,
  Receipt,
  Crown,
} from '@icons';
import { useState } from "react";
import { api } from "../lib/api.js";
import { inr, dateLabel } from "../lib/format.js";
import { thisMonth, addMonths } from "../lib/format.js";
import { useAuth } from "../context/Auth.jsx";
import { CatIcon } from "../lib/cats.jsx";
import {
  useLoad,
  Card,
  Status,
  PageHeader,
  BudgetBar,
  Alert,
  Empty,
  MonthNav,
} from "../components/ui.jsx";
const ChartView = lazy(() => import("../components/Chart.jsx"));
const chartFallback = (
  <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />
);
import CountUp from "../components/CountUp.jsx";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
};

export default function Dashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const { data, loading, error } = useLoad(async () => {
    const [expenses, last, budgets, groups, trend] = await Promise.all([
      api.get(`/expenses?month=${month}`),
      api.get(`/expenses?month=${addMonths(month, -1)}`),
      api.get(`/budgets?month=${month}`),
      api.get("/groups"),
      api.get(`/reports/trend?from=${month}-01&to=${month}-28`),
    ]);
    const bals = await Promise.all(
      groups.map((g) => api.get(`/groups/${g.group_id}/balances`)),
    );
    const mine = bals
      .flatMap((b) => b.balances.filter((x) => x.user_id === user.user_id))
      .map((x) => x.balance);
    return {
      expenses,
      last,
      budgets,
      trend: trend.rows,
      groups: groups.length,
      owed: mine.filter((x) => x > 0).reduce((a, b) => a + b, 0),
      owe: -mine.filter((x) => x < 0).reduce((a, b) => a + b, 0),
    };
  }, [month]);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        sub="Here's where your money went."
        large
      >
        <MonthNav month={month} onChange={setMonth} />
        <Link
          to="/expenses?add=1"
          className="hidden min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 sm:inline-flex"
        >
          <Plus className="size-4" />
          Add expense
        </Link>
      </PageHeader>
      <Status loading={loading} error={error}>
        {data && <Body {...data} />}
      </Status>
    </>
  );
}

const tile = "rounded-3xl p-4 sm:p-5";

function Body({ expenses, last, budgets, trend, groups, owed, owe }) {
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const lastTotal = last.reduce((a, e) => a + e.amount, 0);
  const delta = lastTotal
    ? Math.round(((total - lastTotal) / lastTotal) * 100)
    : null;
  const byCat = Object.entries(
    expenses.reduce(
      (m, e) => ({ ...m, [e.category]: (m[e.category] || 0) + e.amount }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const hot = budgets.filter((b) => b.spent / b.limit_amount >= 0.8);
  const max = Math.max(...trend.map((r) => r[1]), 1);
  const top = byCat[0];

  return (
    <div className="space-y-4">
      {hot.map((b) => (
        <Alert key={b.budget_id} tone="warn">
          {b.category} budget: {inr(b.spent)} of {inr(b.limit_amount)} used (
          {Math.round((b.spent / b.limit_amount) * 100)}%)
          {b.spent >= b.limit_amount
            ? " — over budget."
            : " — nearing the limit."}
        </Alert>
      ))}

      {/* Bento grid: 2 cols on phones, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div
          className={`${tile} col-span-2 flex flex-col justify-between bg-brand-800 text-white shadow-3d-color lg:row-span-2 rise`}
          style={{ "--i": 0 }}
        >
          <div>
            <p className="text-sm text-brand-100">Total spent</p>
            <p className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              <CountUp value={total} />
            </p>
            {delta !== null && (
              <p className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)}% vs
                last month
              </p>
            )}
          </div>
          <div
            className="mt-6 flex h-24 items-end gap-2"
            role="img"
            aria-label="Spending over the last 6 months"
          >
            {trend.map(([m, v], i) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1">
                <div
                  style={{ "--i": i }}
                  className={`growY w-full rounded-md ${i === trend.length - 1 ? "bg-white" : "bg-white/35"}`}
                  style={{ height: `${Math.max((v / max) * 72, 4)}px` }}
                />
                <span className="text-[10px] text-brand-100">
                  {new Date(m + "-01T00:00").toLocaleDateString("en-IN", {
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/groups"
          className={`${tile} bg-sage-700 text-white shadow-3d-color rise`}
          style={{ "--i": 1 }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/20">
            <ArrowDownLeft className="size-4" />
          </span>
          <p className="mt-4 text-xs text-sage-100">You are owed</p>
          <p className="text-xl font-bold sm:text-2xl">
            <CountUp value={owed} />
          </p>
        </Link>
        <Link
          to="/groups"
          className={`${tile} bg-clay-700 text-white shadow-3d-color rise`}
          style={{ "--i": 2 }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/20">
            <ArrowUpRight className="size-4" />
          </span>
          <p className="mt-4 text-xs text-clay-100">You owe</p>
          <p className="text-xl font-bold sm:text-2xl">
            <CountUp value={owe} />
          </p>
        </Link>

        <div
          className={`${tile} bg-sand-100 text-sand-900 shadow-3d rise`}
          style={{ "--i": 3 }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-sand-200 text-sand-800">
            <Crown className="size-4" />
          </span>
          <p className="mt-4 text-xs text-sand-900">Top category</p>
          <p className="truncate text-xl font-bold text-sand-950">
            {top ? top[0] : "—"}
          </p>
          <p className="text-xs text-sand-900">
            {top ? inr(top[1]) : "No spending yet"}
          </p>
        </div>
        <div
          className={`${tile} bg-stone-800 text-white shadow-3d-color rise`}
          style={{ "--i": 4 }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/15">
            <Receipt className="size-4" />
          </span>
          <p className="mt-4 text-xs text-stone-300">Transactions</p>
          <p className="text-xl font-bold sm:text-2xl">
            <CountUp value={expenses.length} format={(n) => Math.round(n)} />
          </p>
          <p className="text-xs text-stone-300">
            avg {inr(expenses.length ? total / expenses.length : 0)}
          </p>
        </div>

        <div
          className={`${tile} col-span-2 bg-white shadow-3d ring-1 ring-stone-200/60 lg:row-span-2 rise`}
          style={{ "--i": 5 }}
        >
          <h2 className="mb-3 font-semibold">Where it went</h2>
          {byCat.length ? (
            <>
              <ChartView
                type="pie"
                labels={byCat.map((c) => c[0])}
                values={byCat.map((c) => c[1])}
              />
              <ul className="mt-4 space-y-3">
                {byCat.slice(0, 4).map(([c, v]) => (
                  <li key={c} className="flex items-center gap-3">
                    <CatIcon name={c} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{c}</span>
                        <span className="font-semibold">{inr(v)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                        <div
                          className="growX h-full rounded-full bg-brand-600"
                          style={{ width: `${(v / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Empty text="No expenses this month yet.">
              <Link
                to="/expenses?add=1"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-4 font-semibold text-white"
              >
                Add your first expense
              </Link>
            </Empty>
          )}
        </div>

        <div
          className={`${tile} col-span-2 bg-white shadow-3d ring-1 ring-stone-200/60 rise`}
          style={{ "--i": 6 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Budgets</h2>
            <Link
              to="/budgets"
              className="inline-flex items-center text-sm font-semibold text-brand-700"
            >
              Manage
              <CaretRight className="size-4" />
            </Link>
          </div>
          {budgets.length ? (
            <ul className="space-y-4">
              {budgets.slice(0, 3).map((b) => (
                <li key={b.budget_id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{b.category}</span>
                    <span className="text-stone-600">
                      {inr(b.spent)} / {inr(b.limit_amount)}
                    </span>
                  </div>
                  <BudgetBar spent={b.spent} limit={b.limit_amount} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">
              Set a monthly limit to get warnings at 80% and 100%.
            </p>
          )}
        </div>

        <div
          className={`${tile} col-span-2 bg-white shadow-3d ring-1 ring-stone-200/60 rise`}
          style={{ "--i": 7 }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent</h2>
            <Link
              to="/expenses"
              className="inline-flex items-center text-sm font-semibold text-brand-700"
            >
              See all
              <CaretRight className="size-4" />
            </Link>
          </div>
          {expenses.length ? (
            <ul className="divide-y divide-stone-100">
              {expenses.slice(0, 4).map((e) => (
                <li
                  key={e.expense_id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <CatIcon name={e.category} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.description || e.category}
                    </p>
                    <p className="text-xs text-stone-600">
                      {dateLabel(e.expense_date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{inr(e.amount)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">Nothing yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
