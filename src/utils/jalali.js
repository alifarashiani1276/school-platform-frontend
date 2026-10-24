import jalaali from "jalaali-js";

export const normalizeDigits = (value = "") =>
  String(value)
    .replace(/[۰-۹]/g, (char) => "۰۱۲۳۴۵۶۷۸۹".indexOf(char).toString())
    .replace(/[٠-٩]/g, (char) => "٠١٢٣٤٥٦٧٨٩".indexOf(char).toString());

export const normalizePhone = (value = "") =>
  normalizeDigits(String(value).trim()).replace(/\s+/g, "");

export const isValidIranianMobile = (value = "") => {
  const normalized = normalizePhone(value);
  return /^09\d{9}$/.test(normalized);
};

export const toGregorianIso = (jalaliDate) => {
  if (!jalaliDate) return "";
  const normalized = normalizeDigits(jalaliDate).replace(/\//g, "/");
  const [jy, jm, jd] = normalized.split("/").map(Number);
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) {
    return "";
  }

  const gregorian = jalaali.toGregorian(jy, jm, jd);
  return `${gregorian.gy}-${String(gregorian.gm).padStart(2, "0")}-${String(gregorian.gd).padStart(2, "0")}`;
};

export const toJalaliString = (isoDate) => {
  if (!isoDate) return "";
  const [gy, gm, gd] = isoDate.split("-").map(Number);
  if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) {
    return isoDate;
  }

  const jalali = jalaali.toJalaali(gy, gm, gd);
  return `${jalali.jy}/${String(jalali.jm).padStart(2, "0")}/${String(jalali.jd).padStart(2, "0")}`;
};

export const formatJalaliForDisplay = (isoDate, locale = "fa") => {
  const jalali = toJalaliString(isoDate);
  if (!jalali) return "-";

  const digits =
    locale === "fa" || locale === "ar" ? "۰۱۲۳۴۵۶۷۸۹" : "0123456789";
  return jalali
    .split("")
    .map((char) => {
      if (/\d/.test(char)) {
        return digits[Number(char)];
      }
      return char;
    })
    .join("");
};
