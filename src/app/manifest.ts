import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Notka",
    short_name: "Notka",
    description: "A minimal self-hosted Markdown notebook.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07111F",
    theme_color: "#07111F",
    orientation: "any",
    icons: [
      {
        src: "/notka-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/notka-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
