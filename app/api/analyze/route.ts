import { type NextRequest, NextResponse } from "next/server"

interface VideoFormat {
  quality: string
  format: string
  size: string
  format_id: string
}

interface VideoInfo {
  title: string
  thumbnail: string
  duration: string
  platform: string
  views?: string
  formats: VideoFormat[]
}

// Simulate video analysis - In production, this would use yt-dlp or similar tools
const analyzeVideo = async (url: string): Promise<VideoInfo> => {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
  const response = await fetch(`${backendUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze video");
  }

  const { videoInfo } = await response.json();
  return videoInfo;
}

const detectPlatform = (url: string): string => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube"
  if (url.includes("instagram.com")) return "Instagram"
  if (url.includes("facebook.com") || url.includes("fb.com")) return "Facebook"
  if (url.includes("linkedin.com")) return "LinkedIn"
  if (url.includes("tiktok.com")) return "TikTok"
  if (url.includes("twitter.com") || url.includes("x.com")) return "Twitter/X"
  return "Unknown"
}

const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    const supportedDomains = [
      "youtube.com",
      "youtu.be",
      "instagram.com",
      "facebook.com",
      "fb.com",
      "linkedin.com",
      "tiktok.com",
      "twitter.com",
      "x.com",
    ]
    return supportedDomains.some((domain) => url.includes(domain))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!validateUrl(url)) {
      return NextResponse.json({ error: "Invalid or unsupported URL" }, { status: 400 })
    }

    const videoInfo = await analyzeVideo(url)

    return NextResponse.json({ videoInfo })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze video. Please try again." }, { status: 500 })
  }
}
