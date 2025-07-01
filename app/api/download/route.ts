import { type NextRequest, NextResponse } from "next/server"

interface DownloadRequest {
  url: string
  format: string
  title: string
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
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

    const backendResponse = await fetch(`${backendUrl}/api/download`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, format, title }),
    });

    if (!backendResponse.ok) {
        const error = await backendResponse.json();
        return NextResponse.json({ error: error.error || "Failed to process download." }, { status: backendResponse.status });
    }

    const headers = new Headers(backendResponse.headers);
    headers.set("Content-Disposition", headers.get("Content-Disposition")!);
    
    return new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers,
    });

  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to process download. Please try again." }, { status: 500 })
  }
}
