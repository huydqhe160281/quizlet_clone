'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadingOverlay } from '@/components/providers/loading-overlay-provider';
import {
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileUp,
  HelpCircle,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSetMutations } from '@/features/sets/hooks/useSets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ImportResult = {
  set: { id: string; title: string };
  cardsCreated: number;
  skippedRows?: number;
};

type ImportSetWizardProps = {
  setId?: string;
  onSuccess?: () => void;
  /** `embedded` = inside Dialog; `page` = standalone import page */
  variant?: 'embedded' | 'page';
};

const MCQ_CSV_EXAMPLE = `front,back,example
"Danh mục tài khoản được khai báo ở menu nào?

a. Tổng hợp
b. Danh mục và số dư
c. Báo cáo
d. Công cụ",B,"Đây là nơi khai báo hệ thống tài khoản và số dư ban đầu."`;

const SIMPLE_CSV_EXAMPLE = `front,back,example
Hello,Xin chào,
"What is API?","Application Programming Interface",`;

const SAMPLE_CSV_FILENAME = 'mau-import-the.csv';
const MCQ_SAMPLE_CSV_FILENAME = 'mau-import-trac-nghiem-abcd.csv';

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const MCQ_JSON_GUIDE_EXAMPLE = `{
  "cards": [
    {
      "front": "Câu hỏi?\\n\\na. Đáp án A\\nb. Đáp án B\\nc. Đáp án C\\nd. Đáp án D",
      "back": "B",
      "example": "Giải thích (tùy chọn)"
    }
  ]
}`;

const SIMPLE_JSON_EXAMPLE = `{
  "cards": [
    { "front": "Hello", "back": "Xin chào" }
  ]
}`;

function FieldLegend() {
  const fields = [
    {
      key: 'front',
      label: 'front',
      desc: 'Câu hỏi + 4 đáp án a, b, c, d (xuống dòng hoặc cùng dòng)',
      sample: 'Danh mục tài khoản...\\na. Tổng hợp\\nb. Danh mục và số dư...',
    },
    {
      key: 'back',
      label: 'back',
      desc: 'Chữ cái đáp án đúng — A, B, C hoặc D',
      sample: 'B',
    },
    {
      key: 'example',
      label: 'example',
      desc: 'Giải thích (tùy chọn) — hiển thị sau khi trả lời sai',
      sample: 'Đây là nơi khai báo hệ thống tài khoản...',
    },
  ];

  return (
    <div className="min-w-0 space-y-2 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5 text-primary" />
        Cấu trúc cột CSV / trường JSON
      </p>
      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className="rounded-lg border border-border/40 bg-background/60 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                {field.label}
              </code>
              <span className="text-xs text-muted-foreground">{field.desc}</span>
            </div>
            <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-muted-foreground/90">
              {field.sample}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function McqPreview() {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        Ví dụ hiển thị khi học
      </p>
      <div className="space-y-2 rounded-lg border border-border/40 bg-background/80 p-3 text-xs">
        <p className="font-semibold leading-relaxed">
          Danh mục tài khoản được khai báo ở menu nào?
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {['a. Tổng hợp', 'b. Danh mục và số dư', 'c. Báo cáo', 'd. Công cụ'].map((opt) => (
            <div
              key={opt}
              className={cn(
                'rounded-md border px-2 py-1.5 text-[11px] font-medium',
                opt.startsWith('b.')
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border/50 bg-muted/30'
              )}
            >
              {opt}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          <span className="font-semibold">back = B</span> → đáp án đúng là{' '}
          <span className="font-semibold">b. Danh mục và số dư</span>
        </p>
      </div>
    </div>
  );
}

function FormatExample({ format }: { format: 'csv' | 'json' }) {
  const content = format === 'csv' ? MCQ_CSV_EXAMPLE : MCQ_JSON_GUIDE_EXAMPLE;

  return (
    <div className="min-w-0 space-y-2 overflow-hidden">
      <p className="text-xs font-semibold text-muted-foreground">
        Mẫu {format.toUpperCase()} — câu trắc nghiệm a/b/c/d
      </p>
      <pre className="max-h-40 max-w-full overflow-auto rounded-xl border border-border/50 bg-muted/30 p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
        {content}
      </pre>
    </div>
  );
}

function McqImportGuide({
  open,
  onToggle,
  format,
}: {
  open: boolean;
  onToggle: () => void;
  format: 'csv' | 'json';
}) {
  return (
    <div className="min-w-0 space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-w-0 items-center gap-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          Import theo cấu trúc a/b/c/d thì{' '}
          <span className="font-semibold text-primary underline-offset-2 hover:underline">
            {open ? 'ẩn chỉ dẫn' : 'xem chỉ dẫn'}
          </span>
        </span>
        <ChevronDown
          className={cn('ml-auto h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="min-w-0 space-y-3 overflow-hidden rounded-xl border border-border/50 bg-muted/10 p-3">
          <FieldLegend />
          <McqPreview />
          <FormatExample format={format} />
        </div>
      )}
    </div>
  );
}

function CsvUploadZone({
  fileRef,
  csvFile,
  onFileChange,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  csvFile: File | null;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={cn(
          'group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 transition-all',
          csvFile
            ? 'border-primary/40 bg-primary/5'
            : 'border-border/60 bg-muted/10 hover:border-primary/30 hover:bg-primary/5'
        )}
      >
        <div
          className={cn(
            'rounded-full p-3 transition-colors',
            csvFile
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground group-hover:text-primary'
          )}
        >
          {csvFile ? <FileSpreadsheet className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {csvFile ? csvFile.name : 'Chọn hoặc kéo thả file CSV'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {csvFile
              ? `${(csvFile.size / 1024).toFixed(1)} KB · Bấm để đổi file`
              : 'UTF-8 · tối đa 2MB · tối đa 500 thẻ'}
          </p>
        </div>
      </button>
    </>
  );
}

export function ImportSetWizard({ setId, onSuccess, variant = 'page' }: ImportSetWizardProps) {
  const router = useRouter();
  const { withLoading } = useLoadingOverlay();
  const { invalidateSetData } = useSetMutations();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEmbedded = variant === 'embedded';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [jsonText, setJsonText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importTab, setImportTab] = useState<'csv' | 'json'>('csv');
  const [showMcqGuide, setShowMcqGuide] = useState(false);

  const handleJsonImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError('JSON không hợp lệ — vui lòng kiểm tra lại định dạng.');
      return;
    }

    const body = setId
      ? {
          format: 'json',
          ...(typeof parsed === 'object' && parsed !== null && 'cards' in parsed ? parsed : {}),
        }
      : {
          format: 'json',
          set: { title, description: description || undefined, visibility },
          ...(typeof parsed === 'object' && parsed !== null && 'cards' in parsed ? parsed : {}),
        };

    const url = setId ? `/api/v1/sets/import?setId=${setId}` : '/api/v1/sets/import';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setError('Vui lòng chọn file CSV.');
      return;
    }

    const form = new FormData();
    form.append('format', 'csv');
    if (!setId) {
      form.append('title', title);
      if (description) form.append('description', description);
      form.append('visibility', visibility);
    }
    form.append('file', csvFile);

    const url = setId ? `/api/v1/sets/import?setId=${setId}` : '/api/v1/sets/import';
    return fetch(url, { method: 'POST', body: form });
  };

  const handleSubmit = async (format: 'json' | 'csv') => {
    if (!setId && !title.trim()) {
      setError('Vui lòng nhập tên bộ thẻ.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await withLoading(
        async () => {
          const response = format === 'json' ? await handleJsonImport() : await handleCsvImport();

          if (!response || !response.ok) {
            const payload = response ? ((await response.json()) as { message?: string }) : null;
            setError(payload?.message ?? 'Import thất bại. Kiểm tra lại file và thử lại.');
            return;
          }

          const { data } = (await response.json()) as { data: ImportResult };
          invalidateSetData(data.set.id);
          await router.refresh();
          setResult(data);
        },
        { message: 'Đang import dữ liệu…' }
      );
    } finally {
      setLoading(false);
    }
  };

  const successView = result ? (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="rounded-full bg-emerald-500/15 p-4 text-emerald-600">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">Import thành công!</h3>
        <p className="text-sm text-muted-foreground">
          {setId
            ? `Đã thêm ${result.cardsCreated} thẻ vào bộ này.`
            : `Đã tạo "${result.set.title}" với ${result.cardsCreated} thẻ.`}
          {result.skippedRows ? ` (${result.skippedRows} dòng trống đã bỏ qua)` : ''}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 pt-2">
        <Button
          className="w-full rounded-xl font-bold"
          onClick={() => {
            if (setId) {
              onSuccess?.();
            } else {
              router.push(`/sets/${result.set.id}`);
              router.refresh();
            }
          }}
        >
          {setId ? 'Đóng' : 'Xem bộ thẻ'}
        </Button>
        {!setId && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setResult(null)}>
            Import thêm
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const formView = (
    <div className={cn('min-w-0 max-w-full space-y-5 overflow-hidden', isEmbedded && 'pr-6')}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">
              {setId ? 'Import thẻ vào bộ này' : 'Import bộ thẻ mới'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {setId ? 'Thêm thẻ từ file CSV hoặc JSON.' : 'Tạo bộ thẻ mới từ CSV hoặc JSON.'}
            </p>
          </div>
        </div>
      </div>

      {!setId && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-4">
          <div className="space-y-2">
            <Label htmlFor="import-title">Tên bộ thẻ *</Label>
            <Input
              id="import-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Fast Accounting TT99"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-description">Mô tả</Label>
            <Textarea
              id="import-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Mô tả ngắn (tùy chọn)"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-visibility">Quyền riêng tư</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as 'PRIVATE' | 'PUBLIC')}
            >
              <SelectTrigger id="import-visibility" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                <SelectItem value="PUBLIC">Công khai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <McqImportGuide
        open={showMcqGuide}
        onToggle={() => setShowMcqGuide((value) => !value)}
        format={importTab}
      />

      <Tabs
        value={importTab}
        onValueChange={(value) => setImportTab(value as 'csv' | 'json')}
        className="min-w-0 w-full"
      >
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="csv" className="rounded-lg text-xs font-semibold">
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </TabsTrigger>
          <TabsTrigger value="json" className="rounded-lg text-xs font-semibold">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            File CSV với cột <code className="text-[10px]">front</code>,{' '}
            <code className="text-[10px]">back</code> — hoặc{' '}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => downloadTextFile(SIMPLE_CSV_EXAMPLE, SAMPLE_CSV_FILENAME)}
            >
              tải CSV mẫu thẻ đơn
            </button>
            {' · '}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => downloadTextFile(MCQ_CSV_EXAMPLE, MCQ_SAMPLE_CSV_FILENAME)}
            >
              tải CSV mẫu a/b/c/d
            </button>
          </p>
          <CsvUploadZone
            fileRef={fileRef}
            csvFile={csvFile}
            onFileChange={(file) => {
              setCsvFile(file);
              setError(null);
            }}
          />
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="w-full rounded-xl font-bold"
            onClick={() => void handleSubmit('csv')}
            disabled={loading || !csvFile}
          >
            {loading ? 'Đang import…' : 'Import CSV'}
          </Button>
        </TabsContent>

        <TabsContent value="json" className="mt-4 min-w-0 space-y-4">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="import-json" className="break-words text-xs text-muted-foreground">
              Dán JSON — hoặc thẻ đơn giản:{' '}
              <code className="text-[10px]">{`{ "front": "...", "back": "..." }`}</code>
            </Label>
            <Textarea
              id="import-json"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              rows={9}
              placeholder={SIMPLE_JSON_EXAMPLE}
              className="max-w-full rounded-xl font-mono text-[11px] leading-relaxed"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="w-full rounded-xl font-bold"
            onClick={() => void handleSubmit('json')}
            disabled={loading || !jsonText.trim()}
          >
            {loading ? 'Đang import…' : 'Import JSON'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (result) {
    return isEmbedded ? (
      successView
    ) : (
      <Card className="glass-panel mx-auto w-full max-w-lg overflow-hidden rounded-2xl border-border/50 shadow-lg">
        <CardContent className="pt-6">{successView}</CardContent>
      </Card>
    );
  }

  if (isEmbedded) {
    return formView;
  }

  return (
    <Card className="glass-panel mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-border/50 shadow-lg">
      <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
        <CardTitle className="text-xl">Import bộ thẻ</CardTitle>
        <CardDescription>
          Hỗ trợ flashcard thường và câu trắc nghiệm có đáp án a, b, c, d.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">{formView}</CardContent>
    </Card>
  );
}
