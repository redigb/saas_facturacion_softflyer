import localFont from "next/font/local";

/**
 * Tipografía del tema Discord del backoffice (Google Sans Flex, variable, licencia OFL), servida desde el
 * proyecto: no consulta a Google. El restaurante sigue con Montserrat.
 */
export const backofficeFont = localFont({
  variable: "--font-backoffice",
  display: "swap",
  src: "../../assets/fonts/google-sans-flex/google-sans-flex-latin-wght-normal.woff2",
  weight: "1 1000",
});
