"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Project } from "@/types/database";
import { branding } from "@/config/branding";
import {
  Download,
  Share2,
  Sparkles,
  Layout,
  Smartphone,
  Square,
  X,
  Palette,
} from "lucide-react";

interface SocialCardGeneratorProps {
  project: Project;
  onClose?: () => void;
}

export function SocialCardGenerator({ project, onClose }: SocialCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<"post" | "story">("post");
  const [accentTheme, setAccentTheme] = useState<"indigo" | "emerald" | "amber" | "cyber">("indigo");
  const [isGenerating, setIsGenerating] = useState(false);

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions
    const width = 1080;
    const height = format === "post" ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (accentTheme === "indigo") {
      bgGrad.addColorStop(0, "#090d16");
      bgGrad.addColorStop(0.5, "#131b2e");
      bgGrad.addColorStop(1, "#070a10");
    } else if (accentTheme === "emerald") {
      bgGrad.addColorStop(0, "#06130d");
      bgGrad.addColorStop(0.5, "#0b261a");
      bgGrad.addColorStop(1, "#040c08");
    } else if (accentTheme === "amber") {
      bgGrad.addColorStop(0, "#140e05");
      bgGrad.addColorStop(0.5, "#261b0a");
      bgGrad.addColorStop(1, "#0a0702");
    } else {
      bgGrad.addColorStop(0, "#0d0221");
      bgGrad.addColorStop(0.5, "#1f0842");
      bgGrad.addColorStop(1, "#050014");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative radial glow
    const radialGlow = ctx.createRadialGradient(width * 0.8, height * 0.2, 50, width * 0.8, height * 0.2, 600);
    const glowColor =
      accentTheme === "indigo"
        ? "rgba(99, 102, 241, 0.25)"
        : accentTheme === "emerald"
        ? "rgba(16, 185, 129, 0.25)"
        : accentTheme === "amber"
        ? "rgba(245, 158, 11, 0.25)"
        : "rgba(236, 72, 153, 0.25)";
    radialGlow.addColorStop(0, glowColor);
    radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid dots
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let x = 40; x < width; x += 40) {
      for (let y = 40; y < height; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Top Header Banner
    const startY = format === "post" ? 80 : 160;

    // Community Spotlight Badge
    ctx.fillStyle = accentTheme === "amber" ? "#f59e0b" : "#6366f1";
    ctx.beginPath();
    ctx.roundRect(80, startY, 320, 50, 25);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("★ COMMUNITY SPOTLIGHT", 105, startY + 32);

    // Community Branding text
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(branding.name.toUpperCase(), width - 80, startY + 34);
    ctx.textAlign = "left";

    // Project Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 58px sans-serif";
    const titleText = project.title.length > 36 ? project.title.slice(0, 36) + "..." : project.title;
    ctx.fillText(titleText, 80, startY + 130);

    // Tagline / Short description
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "28px sans-serif";
    const taglineText = project.tagline.length > 70 ? project.tagline.slice(0, 70) + "..." : project.tagline;
    ctx.fillText(taglineText, 80, startY + 180);

    // Media Box Area
    const boxY = startY + 230;
    const boxHeight = format === "post" ? 420 : 800;
    const boxWidth = width - 160;

    // Draw inner card container
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, boxY, boxWidth, boxHeight, 32);
    ctx.fill();
    ctx.stroke();

    // Project Image or fallback
    if (project.cover_image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = project.cover_image;
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(80, boxY, boxWidth, boxHeight, 32);
        ctx.clip();
        ctx.drawImage(img, 80, boxY, boxWidth, boxHeight);
        ctx.restore();
        drawFooter(ctx, boxY + boxHeight);
      };
      img.onerror = () => {
        drawFallbackCover(ctx, boxY, boxWidth, boxHeight);
        drawFooter(ctx, boxY + boxHeight);
      };
    } else {
      drawFallbackCover(ctx, boxY, boxWidth, boxHeight);
      drawFooter(ctx, boxY + boxHeight);
    }

    function drawFallbackCover(context: CanvasRenderingContext2D, y: number, w: number, h: number) {
      context.fillStyle = "rgba(99, 102, 241, 0.1)";
      context.beginPath();
      context.roundRect(80, y, w, h, 32);
      context.fill();

      context.fillStyle = "#ffffff";
      context.font = "bold 40px monospace";
      context.textAlign = "center";
      context.fillText("</> " + project.category, width / 2, y + h / 2);
      context.textAlign = "left";
    }

    function drawFooter(context: CanvasRenderingContext2D, footerY: number) {
      const bottomY = footerY + 60;

      // Creator Info
      context.fillStyle = "#ffffff";
      context.font = "bold 32px sans-serif";
      context.fillText(`Built by ${project.creator?.full_name || "Community Member"}`, 80, bottomY);

      context.fillStyle = "rgba(255, 255, 255, 0.5)";
      context.font = "24px sans-serif";
      context.fillText(`@${project.creator?.username || "creator"}`, 80, bottomY + 36);

      // Technology tags
      let techX = 80;
      const techY = bottomY + 70;
      const displayTechs = project.technologies?.slice(0, 4) || [{ name: "Next.js" }, { name: "TypeScript" }];

      displayTechs.forEach((t) => {
        const text = t.name;
        context.font = "bold 20px sans-serif";
        const textWidth = context.measureText(text).width;

        context.fillStyle = "rgba(255, 255, 255, 0.1)";
        context.beginPath();
        context.roundRect(techX, techY, textWidth + 30, 42, 12);
        context.fill();

        context.fillStyle = "#ffffff";
        context.fillText(text, techX + 15, techY + 28);

        techX += textWidth + 45;
      });

      // Bottom URL banner
      context.fillStyle = "rgba(255, 255, 255, 0.8)";
      context.font = "bold 24px monospace";
      context.textAlign = "right";
      context.fillText("DEVHUB.COMMUNITY • EXPLORE SHOWCASE", width - 80, bottomY + 95);
      context.textAlign = "left";
    }
  }, [project, format, accentTheme]);

  useEffect(() => {
    drawCard();
  }, [drawCard]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    const link = document.createElement("a");
    link.download = `${project.slug}-spotlight-${format}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Social Media Promotional Card Generator (₹0 Cost)
            </h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Controls Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Social Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("post")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition ${
                    format === "post"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Square className="w-4 h-4" />
                  <span>Square (1:1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition ${
                    format === "story"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Story (9:16)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Color Palette Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccentTheme("indigo")}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 ${
                    accentTheme === "indigo" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50" : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600" />
                  <span>Deep Indigo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccentTheme("emerald")}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 ${
                    accentTheme === "emerald" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                  <span>Emerald Tech</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccentTheme("amber")}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 ${
                    accentTheme === "amber" ? "border-amber-600 bg-amber-50 dark:bg-amber-950/50" : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                  <span>Solar Gold</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccentTheme("cyber")}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 ${
                    accentTheme === "cyber" ? "border-pink-600 bg-pink-50 dark:bg-pink-950/50" : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-pink-500" />
                  <span>Cyberpunk</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Download High-Res PNG (1080p)</span>
            </button>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Exported graphics can be published immediately to Instagram posts, reels covers, LinkedIn project highlights, and story announcements.
            </p>
          </div>

          {/* Live Canvas Preview Column */}
          <div className="md:col-span-2 flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="max-h-[520px] max-w-full overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-h-[500px] w-auto rounded-xl shadow-2xl border border-neutral-800 object-contain"
              />
            </div>
            <span className="text-[10px] text-neutral-400 mt-3">
              Rendered natively in-browser with HTML5 Canvas (Resolution: {format === "post" ? "1080x1080" : "1080x1920"})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
