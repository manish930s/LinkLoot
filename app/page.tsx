"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, Play, Clock, Eye, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"

interface VideoInfo {
  title: string
  thumbnail: string
  duration: string
  platform: string
  views?: string
  formats: Array<{
    quality: string
    format: string
    size: string
    format_id: string
  }>
}

interface DownloadHistory {
  id: string
  title: string
  platform: string
  downloadedAt: string
  format: string
}

export default function MediaDownloader() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedFormat, setSelectedFormat] = useState("")
  const [error, setError] = useState("")
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([])
  const [isDownloading, setIsDownloading] = useState(false)

  const supportedPlatforms = [
    { name: "YouTube", domain: "youtube.com", color: "bg-red-500" },
    { name: "Instagram", domain: "instagram.com", color: "bg-pink-500" },
    { name: "Facebook", domain: "facebook.com", color: "bg-blue-600" },
    { name: "LinkedIn", domain: "linkedin.com", color: "bg-blue-700" },
    { name: "TikTok", domain: "tiktok.com", color: "bg-black" },
    { name: "Twitter/X", domain: "twitter.com", color: "bg-gray-800" },
  ]

  const detectPlatform = (url: string) => {
    const lowerUrl = url.toLowerCase()
    
    // Check for YouTube variations
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('youtube.com/shorts')) {
      return supportedPlatforms.find(p => p.name === "YouTube")
    }
    
    // Check for Instagram
    if (lowerUrl.includes('instagram.com')) {
      return supportedPlatforms.find(p => p.name === "Instagram")
    }
    
    // Check for Facebook
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
      return supportedPlatforms.find(p => p.name === "Facebook")
    }
    
    // Check for LinkedIn
    if (lowerUrl.includes('linkedin.com')) {
      return supportedPlatforms.find(p => p.name === "LinkedIn")
    }
    
    // Check for TikTok
    if (lowerUrl.includes('tiktok.com')) {
      return supportedPlatforms.find(p => p.name === "TikTok")
    }
    
    // Check for Twitter/X
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return supportedPlatforms.find(p => p.name === "Twitter/X")
    }
    
    return null
  }

  const validateUrl = (url: string) => {
    console.log("validateUrl called with:", url)
    try {
      const urlObj = new URL(url)
      console.log("URL object created successfully:", urlObj.hostname)
      const platform = detectPlatform(url)
      console.log("Detected platform:", platform)
      const result = platform !== null
      console.log("Validation result:", result)
      return result
    } catch (error) {
      console.log("URL validation error:", error)
      return false
    }
  }

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL")
      return
    }

    if (!validateUrl(url)) {
      setError("Please enter a valid URL from a supported platform")
      return
    }

    setIsLoading(true)
    setError("")
    setVideoInfo(null)

    try {
      const response = await fetch(`/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze video")
      }

      setVideoInfo(data.videoInfo)
      setSelectedFormat(data.videoInfo.formats[0]?.quality || "")
    } catch (err) {
      console.error("API Error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo || !selectedFormat) return

    setIsDownloading(true)
    setError('')

    try {
      const selectedFormatDetails = videoInfo.formats.find(f => f.quality === selectedFormat);

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          format: selectedFormatDetails?.format_id || selectedFormat,
          title: videoInfo.title,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Download failed');
      }

      const contentDisposition = response.headers.get('content-disposition');
      let filename = videoInfo.title;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      const newHistoryItem: DownloadHistory = {
        id: new Date().toISOString(),
        title: videoInfo.title,
        platform: videoInfo.platform,
        downloadedAt: new Date().toLocaleString(),
        format: selectedFormat,
      }
      setDownloadHistory([newHistoryItem, ...downloadHistory.slice(0, 4)])

      toast({
        title: "Download Started",
        description: `${videoInfo.title} is downloading.`,
        variant: "default",
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during download.');
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : 'An unknown error occurred.',
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const platform = detectPlatform(url)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-all duration-500">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header with Theme Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
          <div className="text-center flex-1">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Universal Media Downloader
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
              Download videos and audio from your favorite platforms with style ✨
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Enhanced Supported Platforms */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {supportedPlatforms.map((platform, index) => (
            <div
              key={platform.name}
              className="group relative overflow-hidden rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="px-4 py-2 flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${platform.color} shadow-sm group-hover:shadow-md transition-shadow`}
                />
                <span className="font-medium text-gray-700 dark:text-gray-200">{platform.name}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </div>
          ))}
        </div>

        {/* Enhanced Main Input Section */}
        <Card className="max-w-4xl w-full mx-auto mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-lg"></div>
          <CardHeader className="relative px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Enter Video URL
              </span>
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
              Paste the URL of any video from supported platforms and watch the magic happen ✨
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-6 px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative group">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pr-24 h-14 text-lg bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm focus:shadow-lg transition-all duration-300"
                />
                {platform && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-in slide-in-from-right-2 duration-300">
                    <Badge
                      variant="secondary"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg"
                    >
                      <div className={`w-2 h-2 rounded-full ${platform.color} mr-2 animate-pulse`} />
                      {platform.name}
                    </Badge>
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isLoading || !url.trim()}
                className="px-8 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Analyze</span>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </Button>
            </div>

            {/* AdSense Banner Below Main Input */}
            <div className="w-full flex justify-center my-6">
              <ins
                className="adsbygoogle"
                style={{ display: "block", width: "100%", minHeight: 90 }}
                data-ad-client="ca-pub-3136730634801361"
                data-ad-slot="1234567890" // <-- Replace with your actual ad slot ID
                data-ad-format="auto"
                data-full-width-responsive="true"
              ></ins>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 animate-in slide-in-from-top-2 duration-300"
              >
                <AlertTriangle className="h-5 w-5" />
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Video Preview */}
        {videoInfo && (
          <Card className="max-w-4xl w-full mx-auto mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-lg"></div>
            <CardContent className="relative p-4 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                <div className="md:col-span-1">
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 shadow-xl group">
                    <img
                      src={videoInfo.thumbnail || "/placeholder.svg?height=180&width=320"}
                      alt={videoInfo.title}
                      className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-black/50 text-white border-0 backdrop-blur-sm">{videoInfo.duration}</Badge>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                      {videoInfo.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{videoInfo.duration}</span>
                      </div>
                      {videoInfo.views && (
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                          <Eye className="w-4 h-4" />
                          <span className="font-medium">{videoInfo.views}</span>
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0"
                      >
                        {videoInfo.platform}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Select Format & Quality
                    </label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger className="h-12 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
                        <SelectValue placeholder="Choose format and quality" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                        {videoInfo.formats.map((format, index) => (
                          <SelectItem
                            key={index}
                            value={format.quality}
                            className="hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 rounded-lg m-1"
                          >
                            <span className="font-medium">
                              {format.format} - {format.quality}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {format.size}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Instagram Download Warning */}
                    {videoInfo.platform === 'Instagram' && (
                      <Alert variant="default" className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 animate-in slide-in-from-top-2 duration-300">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <AlertDescription className="text-base text-yellow-800 dark:text-yellow-200">
                          Instagram downloads require periodic cookie updates due to Instagram's security policies. If downloads stop working, please update the cookies file in the backend.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Button
                    onClick={handleDownload}
                    disabled={!selectedFormat || isDownloading}
                    className="w-full h-14 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-semibold disabled:opacity-50 mt-2"
                  >
                    {isDownloading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Preparing Download...</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-200"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-400"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5" />
                        <span>Download Now</span>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Download History */}
        {downloadHistory.length > 0 && (
          <Card className="max-w-4xl w-full mx-auto mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-lg"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                  Recent Downloads
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {downloadHistory.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden p-4 bg-gradient-to-r from-white/50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white truncate text-lg">{item.title}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge
                            variant="outline"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0"
                          >
                            {item.platform}
                          </Badge>
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
                            {item.format}
                          </Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.downloadedAt}</span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Disclaimer */}
        <Card className="max-w-4xl w-full mx-auto bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl">Important Disclaimer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700 dark:text-amber-300 space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  Please respect copyright laws and platform terms of service when downloading content.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  Only download content you have permission to use or that is in the public domain.
                </p>
              </div>
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  This tool is for personal use only. Commercial use may require additional permissions.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  We are not responsible for any misuse of downloaded content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-16 py-8">
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <span>Made with</span>
            <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
            <span>by Manish Chauhan</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
