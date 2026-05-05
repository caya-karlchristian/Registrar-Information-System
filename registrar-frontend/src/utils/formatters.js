import React from "react";

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
  const day = d.getDate();
  const ordinal = getOrdinal(day);
  const suffix = ordinal.replace(/^\d+/, "");
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return React.createElement(
    React.Fragment,
    null,
    day,
    React.createElement("sup", null, suffix),
    " day of ",
    month,
    " ",
    year
  );
};

export const CURRENT_YEAR = new Date().getFullYear();