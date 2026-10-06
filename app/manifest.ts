import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bank of Dad",
    short_name: "Bank of Dad",
    description: "A family money ledger for parents and kids.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#172033",
    orientation: "any",
    icons: [
      {
        src: "/icons/bank-of-dad.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/bank-of-dad-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Parent Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
      },
      {
        name: "Wall Dashboard",
        short_name: "Wall",
        url: "/wall",
      },
    ],
  };
}
