import { formatDate } from "../../utils/dateFormat";
import { ArrowLeft, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import Button from "../../components/ui/Button";
import {
  mockTeacher,
  rechargeTeacherWallet,
  teacherWallet,
} from "../../data/mockTeacherData";

const RECHARGE_OPTIONS = [500000, 1000000, 2000000, 5000000];

const mockTransactions = [
  {
    id: 1,
    type: "recharge",
    amount: 500000,
    labelKey: "teacher.wallet.tx.initial",
    date: "2025-09-01",
  },
  {
    id: 2,
    type: "lesson",
    amount: -150000,
    labelKey: "teacher.wallet.tx.mathLesson",
    date: "2025-09-05",
  },
  {
    id: 3,
    type: "recharge",
    amount: 1000000,
    labelKey: "teacher.wallet.tx.manual",
    date: "2025-09-10",
  },
];

export default function TeacherWalletPage() {
  const { t, i18n } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(teacherWallet.balance);
  const [customAmount, setCustomAmount] = useState("500000");

  const handleRecharge = (amount) => {
    const nextBalance = rechargeTeacherWallet(amount);
    setBalance(nextBalance);
    setCustomAmount("500000");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 transition-all duration-300">
        <TeacherTopbar
          teacher={mockTeacher}
          onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={16} />
            {t("teacher.class.backToClasses")}
          </Link>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">
                      {t("teacher.wallet.title")}
                    </p>
                    <h1 className="text-3xl font-black text-foreground">
                      {balance.toLocaleString(i18n.language)} {t(teacherWallet.currencyKey)}
                    </h1>
                  </div>
                </div>

                <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-bold text-primary">
                  {t("teacher.wallet.free")}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("teacher.wallet.classCreation")}
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {t("teacher.wallet.free")}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("teacher.wallet.lessonPrice")}
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    150,000 {t(teacherWallet.currencyKey)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-bold text-primary">
                  {t("teacher.wallet.paymentReady")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("teacher.wallet.backendDescription")}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <CreditCard size={20} />
                </div>
                <h2 className="text-xl font-black text-foreground">
                  {t("teacher.wallet.rechargeTitle")}
                </h2>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {RECHARGE_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleRecharge(amount)}
                    className="rounded-2xl border border-border bg-muted px-3 py-3 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    {amount.toLocaleString(i18n.language)} {t(teacherWallet.currencyKey)}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-bold text-foreground">
                  {t("teacher.wallet.customAmount")}
                </label>
                <input
                  type="number"
                  min="100000"
                  step="100000"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="mt-5">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => handleRecharge(Number(customAmount) || 0)}
                >
                  {t("teacher.wallet.confirmRecharge")}
                </Button>
              </div>
            </section>
          </div>

          <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-black text-foreground">
              {t("teacher.wallet.transactions")}
            </h2>

            <div className="mt-5 space-y-3">
              {mockTransactions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4"
                >
                  <div>
                    <p className="font-black text-foreground">{t(item.labelKey)}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(item.date, i18n.language)}</p>
                  </div>

                  <span
                    className={`text-sm font-black ${
                      item.amount > 0 ? "text-green-600" : "text-foreground"
                    }`}
                  >
                    {item.amount > 0 ? "+" : ""}
                    {item.amount.toLocaleString(i18n.language)}{" "}
                    {t(teacherWallet.currencyKey)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
