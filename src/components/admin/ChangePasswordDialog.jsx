import { useState } from "react";
import Dialog from "../ui/Dialog";
import {
  MIN_PASSWORD_LENGTH,
  changeOwnPassword,
} from "../../services/schoolRegistry";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// The manager replaces the temporary password the owner gave him.
export default function ChangePasswordDialog({ open, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPassword("");
    setRepeat("");
    setError("");
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
      return;
    }
    if (password !== repeat) {
      setError("تکرار رمز عبور با رمز واردشده یکسان نیست.");
      return;
    }
    setBusy(true);
    try {
      await changeOwnPassword(password);
      onDone();
      close();
    } catch {
      setError("تغییر رمز عبور انجام نشد. دوباره وارد شوید و تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title="تغییر رمز عبور" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="pw-new" className="mb-1 block text-sm font-semibold">
            رمز عبور جدید
          </label>
          <input
            id="pw-new"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="pw-repeat" className="mb-1 block text-sm font-semibold">
            تکرار رمز عبور
          </label>
          <input
            id="pw-repeat"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          ذخیره رمز عبور
        </button>
      </form>
    </Dialog>
  );
}
