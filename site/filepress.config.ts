import { defineFilepressConfig } from "getfilepress";

const github = "https://github.com/Catalyst-Forge-LLC/appledger";

export default defineFilepressConfig({
  title: "AppLedger",
  description:
    "An open text record of what an application is for, how it fits together, what it does, and how it changes.",
  url: "https://appledger.dev",
  author: "Catalyst Forge LLC",
  tagline: "The application, written down.",
  lede: "Purpose, structure, evidence, and change.",
  homePage: "home",
  nav: [
    { label: "Home", href: "/" },
    { label: "GitHub", href: github, icon: "github" },
  ],
  footerLinks: [
    { label: "GitHub", href: github, icon: "github" },
    { label: "ForgeTrail", href: "https://forgetrail.dev" },
    { label: "Catalyst Forge", href: "https://catalystforge.com" },
  ],
});
