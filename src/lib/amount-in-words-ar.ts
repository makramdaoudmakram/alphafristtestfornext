/**
 * Arabic amount-in-words — mirrors old InterfaceApp NumberToString
 * (TreasuryIn Refresh: "فقط " + GetNumberAr() + "لا غير").
 */
const ones = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
];

function convertOne(d: string): string {
  return ones[parseInt(d, 10)] ?? "";
}

function convertTwo(two: string): string {
  const a = two[0];
  const b = two[1];
  if (a === "0" && b !== "0") return convertOne(b);
  if (a === "1") {
    if (b === "1") return "إحدى عشر";
    if (b === "2") return "إثنى عشر";
    return `${convertOne(b)} عشر`.trim();
  }
  const tens = [
    "",
    "",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
  const t = tens[parseInt(a, 10)] ?? "";
  if (b === "0") return t;
  return `${convertOne(b)} و ${t}`;
}

function convertThree(n: string): string {
  const h = n[0];
  const rest = n.slice(1);
  const hundreds = [
    "",
    "مائة",
    "مائتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ];
  const hWord = hundreds[parseInt(h, 10)] ?? "";
  if (rest === "00") return hWord;
  if (rest[0] === "0") return `${hWord} و ${convertOne(rest[1])}`.trim();
  return `${hWord} و ${convertTwo(rest)}`.trim();
}

function convertIntegerPart(intPart: string): string {
  const n = intPart.replace(/^0+/, "") || "0";
  if (n === "0") return "صفر";
  if (n.length === 1) return convertOne(n);
  if (n.length === 2) return convertTwo(n);
  if (n.length === 3) return convertThree(n);
  if (n.length === 4) {
    const thousands = n[0] === "1" ? "ألف" : n[0] === "2" ? "ألفان" : `${convertOne(n[0])} آلاف`;
    const rest = n.slice(1);
    if (rest === "000") return thousands;
    return `${thousands} و ${convertIntegerPart(rest)}`;
  }
  if (n.length <= 6) {
    const left = n.slice(0, n.length - 3);
    const right = n.slice(-3);
    const leftWord =
      left === "1"
        ? "ألف"
        : left === "2"
          ? "ألفان"
          : `${convertIntegerPart(left)} ألف`;
    if (right === "000") return leftWord;
    return `${leftWord} و ${convertThree(right)}`;
  }
  if (n.length === 7) {
    const millions =
      n[0] === "1" ? "مليون" : n[0] === "2" ? "مليونان" : `${convertOne(n[0])} ملايين`;
    const rest = n.slice(1);
    if (rest === "000000") return millions;
    return `${millions} و ${convertIntegerPart(rest)}`;
  }
  return "No Number";
}

/** Returns full amount string with فقط … لا غير */
export function amountInArabicWords(amount: string | number): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
  if (Number.isNaN(num)) throw new Error("Invalid amount");
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const pounds = convertIntegerPart(intPart);
  const piastres = convertTwo(decPart.padStart(2, "0"));
  const body =
    decPart === "00"
      ? `${pounds} جنيها `
      : `${pounds} جنيها  و ${piastres} قرشا `;
  return `فقط ${body}لا غير`;
}
