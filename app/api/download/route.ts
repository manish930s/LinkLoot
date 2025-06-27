import { type NextRequest, NextResponse } from "next/server"
import fetch from "node-fetch"
import { createWriteStream } from "fs"
import { join } from "path"
import { execFile } from "child_process"
import { promisify } from "util"
const execFileAsync = promisify(execFile)

interface DownloadRequest {
  url: string
  format: string
  title: string
}

// Simulate download processing - In production, this would use yt-dlp, ffmpeg, etc.
const processDownload = async (url: string, format: string, title: string) => {
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")
  // If the format_id is 'mp3' or 'Audio Only', force mp3 output, else use mp4 or the format's ext
  const isAudioOnly = format.toLowerCase().includes('audio') || format.toLowerCase().includes('mp3')
  const extension = isAudioOnly ? "mp3" : "mp4"
  const filename = `${sanitizedTitle}.${extension}`
  const outputPath = `public/${filename}`

  // Build yt-dlp arguments
  let args = [
    url,
    "-f", format,
    "-o", outputPath,
    ...(isAudioOnly ? ["--extract-audio", "--audio-format", "mp3"] : [])
  ]

  try {
    await execFileAsync("yt-dlp", args)
  } catch (err: any) {
    // If format is not available, fallback to best
    if (err.stderr && err.stderr.includes("Requested format is not available")) {
      args = [
        url,
        "-f", isAudioOnly ? "bestaudio" : "best",
        "-o", outputPath,
        ...(isAudioOnly ? ["--extract-audio", "--audio-format", "mp3"] : [])
      ]
      await execFileAsync("yt-dlp", args)
    } else {
      throw err
    }
  }

  const downloadUrl = `/${filename}`

  return {
    downloadUrl,
    filename,
    size: "Unknown",
    processingTime: "yt-dlp download",
  }
}

const getEstimatedSize = (format: string): string => {
  const sizeMap: Record<string, string> = {
    "1080p": "245 MB",
    "720p": "156 MB",
    "480p": "89 MB",
    "Audio Only": "15 MB",
    Original: "12 MB",
    Compressed: "8 MB",
    HD: "78 MB",
    SD: "45 MB",
  }

  return sizeMap[format] || "50 MB"
}

const validateDownloadRequest = (data: any): data is DownloadRequest => {
  return (
    typeof data.url === "string" &&
    typeof data.format === "string" &&
    typeof data.title === "string" &&
    data.url.length > 0 &&
    data.format.length > 0 &&
    data.title.length > 0
  )
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!validateDownloadRequest(data)) {
      return NextResponse.json({ error: "Invalid download request data" }, { status: 400 })
    }

    const { url, format, title } = data

    // Rate limiting check (in production, implement proper rate limiting)
    const userIP = request.headers.get("x-forwarded-for") || "unknown"
    console.log(`Download request from ${userIP}: ${title} (${format})`)

    const result = await processDownload(url, format, title)

    return NextResponse.json({
      success: true,
      downloadUrl: result.downloadUrl,
      filename: result.filename,
      size: result.size,
      processingTime: result.processingTime,
      message: "Download prepared successfully",
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to process download. Please try again." }, { status: 500 })
  }
}
