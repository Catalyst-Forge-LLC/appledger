import { defineFilepressConfig } from "getfilepress";

const github = "https://github.com/Catalyst-Forge-LLC/appledger";

export default defineFilepressConfig({
  title: "AppLedger",
  description: "When a new agent session loses the reasons behind your code, AppLedger gives it a record to read. Keep purpose, decisions, structure, and evidence in portable files beside the application.",
  url: "https://appledger.dev",
  author: "Catalyst Forge LLC",
  tagline: "The application, written down.",
  lede: "Text record and CLI for application context",
  logo: "/logo.png",
  ogImage: "/logo.png",
  homePage: "home",
  nav: [
    { label: "Home", href: "/" },
    { label: "Docs", href: "/docs" },
    { label: "GitHub", href: github, icon: "github" },
  ],
  footerLinks: [
    { label: "See the rest of the Catalyst Forge shelf.", href: "https://catalystforge.com/tools/" },
    { label: "Docs", href: "/docs" },
    { label: "GitHub", href: github, icon: "github" },
    { label: "ForgeTrail", href: "https://forgetrail.dev" },
    { label: "xFacts", href: "https://xfacts.dev" },
    { label: "Catalyst Forge", href: "https://catalystforge.com" },
  ],
  paths: [{ url: "/docs", dir: "docs/dist" }],
});
