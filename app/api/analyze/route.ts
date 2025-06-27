import { type NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
const execFileAsync = promisify(execFile)

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
  // Use yt-dlp to get real video info
  const { stdout } = await execFileAsync("yt-dlp", ["--dump-json", url])
  const info = JSON.parse(stdout)

  // Map yt-dlp formats to your format structure
  const formats: VideoFormat[] = (info.formats || [])
    .filter((f: any) => f.filesize || f.format_note || f.quality || f.format_id)
    .map((f: any) => ({
      quality: f.format_note || f.format_id || f.quality || "unknown",
      format: f.ext ? f.ext.toUpperCase() : "",
      size: f.filesize ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` : "-",
      format_id: f.format_id || ""
    }))

  // Add audio only option if available
  if (info.formats) {
    const audio = info.formats.find((f: any) => f.vcodec === "none" && f.acodec !== "none")
    if (audio) {
      formats.push({
        quality: "Audio Only",
        format: audio.ext ? audio.ext.toUpperCase() : "MP3",
        size: audio.filesize ? `${(audio.filesize / (1024 * 1024)).toFixed(1)} MB` : "-",
        format_id: audio.format_id || ""
      })
    }
  }

  // Always add an explicit MP3 option
  formats.push({
    quality: "MP3",
    format: "MP3",
    size: "-",
    format_id: "mp3"
  })

  return {
    title: info.title,
    thumbnail: info.thumbnail,
    duration: info.duration ? `${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}` : "-",
    platform: info.extractor_key || "Unknown",
    views: info.view_count ? `${info.view_count} views` : undefined,
    formats: formats.length > 0 ? formats : [{ quality: "best", format: info.ext ? info.ext.toUpperCase() : "", size: "-", format_id: "best" }],
  }
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
