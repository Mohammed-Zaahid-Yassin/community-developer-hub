// Centralized Community Branding Configuration
// Allows administrators to easily white-label or customize the platform identity

export interface BrandingConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logo: {
    iconName: string;
    text: string;
  };
  communityAffiliation: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    discord?: string;
    instagram?: string;
  };
  navigation: Array<{
    title: string;
    href: string;
    icon: string;
    badge?: string;
  }>;
  contactEmail: string;
  appearance: {
    defaultTheme: 'system' | 'dark' | 'light';
    accentColor: string;
  };
}

export const branding: BrandingConfig = {
  name: "Community Developer Hub",
  shortName: "DevHub",
  tagline: "Showcase, Collaborate, and Elevate Your Code Together",
  description:
    "The dedicated open-source hub for community developers to showcase software projects, find skilled collaborators, track contribution streaks, and get recognized.",
  logo: {
    iconName: "Terminal",
    text: "DevHub",
  },
  communityAffiliation: "NIC Tech Community",
  socialLinks: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    twitter: "https://x.com",
    discord: "https://discord.gg",
    instagram: "https://instagram.com",
  },
  navigation: [
    { title: "Home", href: "/", icon: "Home" },
    { title: "Explore Projects", href: "/projects", icon: "Compass" },
    { title: "Collaborate", href: "/collaborate", icon: "Users" },
    { title: "Leaderboard", href: "/leaderboard", icon: "Trophy" },
    { title: "Challenges", href: "/challenges", icon: "Flame" },
    { title: "Community", href: "/community", icon: "Globe" },
  ],
  contactEmail: "lead@devhub.internal",
  appearance: {
    defaultTheme: "system",
    accentColor: "#6366f1", // Indigo
  },
};
