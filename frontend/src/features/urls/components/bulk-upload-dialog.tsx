import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBulkUploadUrls } from '@/features/urls/hooks/use-urls';

function parseUrlsFromJson(text: string): string[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('JSON file must contain an array of URLs');

  return parsed.map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object' && 'url' in entry && typeof (entry as { url: unknown }).url === 'string') {
      return (entry as { url: string }).url;
    }
    throw new Error('Each entry must be a URL string or an object with a "url" field');
  });
}

export function BulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkUpload = useBulkUploadUrls();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setPastedJson(text);
  };

  const handleUpload = async () => {
    let urls: string[];
    try {
      urls = parseUrlsFromJson(pastedJson);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid JSON');
      return;
    }

    if (urls.length === 0) {
      toast.error('No URLs found in the file');
      return;
    }

    await bulkUpload.mutateAsync(urls);
    setOpen(false);
    setPastedJson('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" />
          Bulk upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk upload URLs</DialogTitle>
          <DialogDescription>
            Upload a JSON file containing an array of URLs, e.g. {'["https://example.com", "https://api.example.com"]'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => void handleFileChange(e)}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {fileName && <p className="text-xs text-muted-foreground">Loaded: {fileName}</p>}

          <textarea
            value={pastedJson}
            onChange={(e) => setPastedJson(e.target.value)}
            placeholder='["https://www.google.com", "https://www.github.com"]'
            rows={6}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <DialogFooter>
          <Button onClick={() => void handleUpload()} disabled={bulkUpload.isPending || !pastedJson.trim()}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
