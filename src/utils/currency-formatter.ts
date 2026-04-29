type CurrencyFormatterOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currency: "USD" | "GBP" | "NGN";
};

const currencyFormatter = (
  input: number,
  options: CurrencyFormatterOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    currency: "NGN",
  },
) => {
  const { minimumFractionDigits, maximumFractionDigits, currency } = options;
  const formattedNumber = new Intl.NumberFormat(
    currency == "NGN" ? "en-NG" : "en-US",
    {
      style: "currency",
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits,
    },
  ).format(Number(input));

  return formattedNumber;
};

export default currencyFormatter;
