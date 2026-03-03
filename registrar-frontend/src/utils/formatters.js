export const formatDateFormal = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatDateOrdinal = (date) => {
  const d = new Date(date);
  const day = getOrdinal(d.getDate());
  const month = d.toLocaleString("en-US", { month: "long" }).toLowerCase();
  const year = d.getFullYear();
  return `${day} day of ${month} ${year}`;
};