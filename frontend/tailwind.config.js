/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.jsx"],
  theme: {
    extend: {
     colors: {
  trace: {
    50: "#F1EEFC",
    100: "#E3DEF9",
    200: "#C8BEF3",
    300: "#A99BEA",
    400: "#8873E0",
    500: "#6650D4",
    600: "#432DD8",
    700: "#3520B0",
    800: "#281889",
    900: "#1B1062",
  },
  ink: "#111827",
  paper: "#F7F8FC",
},
    },
  },
  plugins: [],
};
