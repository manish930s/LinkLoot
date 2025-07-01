import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function VideoLoadingSkeleton() {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Skeleton className="w-full aspect-video rounded-lg" />
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>

            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
