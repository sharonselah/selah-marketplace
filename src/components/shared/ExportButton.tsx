'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { downloadCsv, type Cell } from '@/lib/csv';

/** Builds the rows only on click, so pages don't pay for exports nobody asks for. */
export function ExportButton({ filename, build, label = 'Export CSV', size = 'md' }: { filename: string; build: () => { head: string[]; rows: Cell[][] }; label?: string; size?: 'sm' | 'md' }) {
  return (
    <Button
      variant="outline"
      size={size}
      icon={<Download className="size-4" />}
      onClick={() => {
        const { head, rows } = build();
        if (!rows.length) return toast('Nothing to export yet.', 'info');
        downloadCsv(filename, head, rows);
        toast(`Downloaded ${filename}.csv`);
      }}
    >
      {label}
    </Button>
  );
}
