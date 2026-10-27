import type { MetadataRoute } from "next";

// Lets the team add SYB CRM to their phone's home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SYB CRM",
    short_name: "SYB CRM",
    description: "See You Abroad student pipeline",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
