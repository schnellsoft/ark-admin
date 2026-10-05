import { listMedia } from "@/lib/content";
import { MediaUploader } from "@/components/media-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MediaPage() {
  const files = await listMedia();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Media</h1>
        <p className="text-slate-600">Upload images and videos to R2 for the clinic site.</p>
      </div>
      <MediaUploader />
      <Card>
        <CardHeader>
          <CardTitle>Library</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {files.length === 0 ? <li className="text-slate-500">No media yet.</li> : null}
            {files.map((file) => (
              <li key={file.key} className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                <span className="truncate font-mono text-xs">{file.key}</span>
                <span className="text-xs text-slate-500">{file.size} B</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
