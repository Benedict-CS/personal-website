import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading analytics">
      <div className="h-9 w-32 rounded-lg skeleton-shimmer" />
      <div className="flex flex-wrap gap-4">
        <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-20 rounded-lg skeleton-shimmer" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader><div className="h-5 w-24 rounded-lg skeleton-shimmer" /></CardHeader>
            <CardContent><div className="h-8 w-16 rounded-lg skeleton-shimmer" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><div className="h-6 w-32 rounded-lg skeleton-shimmer" /></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-5 flex-1 max-w-[200px] rounded-lg skeleton-shimmer" />
                  <div className="h-5 w-12 rounded-lg skeleton-shimmer" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div className="h-6 w-24 rounded-lg skeleton-shimmer" /></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-5 w-32 rounded-lg skeleton-shimmer" />
                  <div className="h-5 w-12 rounded-lg skeleton-shimmer" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
