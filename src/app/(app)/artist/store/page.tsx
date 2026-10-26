'use client';

import { useState } from 'react';
import { Music, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { PayoutPreview } from '@/components/shared/Escrow';
import { Button } from '@/components/ui/Button';
import { Cover, EmptyState, Money, PageHeader, Stat } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { FileDrop, Modal, ProcessingSteps } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { CONTENT_TYPE, type ContentType } from '@/lib/constants/enums';
import { CONTENT_TYPE_LABEL } from '@/lib/constants/labels';
import { kes } from '@/lib/format';
import { personRef } from '@/lib/selectors';
import { addContent, removeContent, updateContentPrice } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';
import type { ContentId, Minor } from '@/types';

export default function StorePage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const items = world.content.filter((c) => c.artistId === artist.id);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState<ContentType>('PAID_MIX');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('300');
  const [files, setFiles] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: ContentId; price: string } | null>(null);
  const revenue = items.reduce((a, c) => a + c.price * c.sales, 0) as Minor;

  const reset = () => {
    setOpen(false);
    setUploading(false);
    setTitle('');
    setDescription('');
    setFiles([]);
  };

  return (
    <div>
      <PageHeader title="Store & content" subtitle="Sell mixes, live sets and merch directly to fans." action={<Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Add item</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Items listed" value={items.length} />
        <Stat label="Total sales" value={items.reduce((a, c) => a + c.sales, 0)} />
        <Stat label="Gross revenue" value={<Money amount={revenue} />} />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Music className="size-8" />} title="Your store is empty" body="Upload a mix or add merch to start earning between gigs." action={<Button onClick={() => setOpen(true)}>Add your first item</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-card bg-surface shadow-card">
              <Cover cover={c.cover} className="flex h-28 items-center justify-center text-white">
                {c.type === 'MERCH' ? <ShoppingBag className="size-8" /> : <Music className="size-8" />}
              </Cover>
              <div className="p-4">
                <div className="text-xs text-muted">{CONTENT_TYPE_LABEL[c.type]}</div>
                <div className="font-medium text-text">{c.title}</div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <Money amount={c.price} className="font-semibold text-text" />
                  <span className="text-muted">{c.sales} sold</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ id: c.id, price: String(c.price / 100) })}>Edit price</Button>
                  <Button size="sm" variant="ghost" aria-label="Remove" onClick={() => { removeContent(c.id); toast('Item removed', 'info'); }}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={reset} title="Add to your store">
        {uploading ? (
          <ProcessingSteps
            title="Publishing"
            done="Live in your store"
            steps={files.length ? [`Uploading ${files[0]}`, 'Processing audio & artwork', 'Publishing to your store'] : ['Saving item', 'Publishing to your store']}
            onDone={() => {
              addContent(artist.id, { type, title: title.trim(), description: description.trim(), price: kes(Number(price)) });
              toast('Item published');
              reset();
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Type">
              <Select value={type} onChange={setType} options={CONTENT_TYPE.map((t) => ({ value: t, label: CONTENT_TYPE_LABEL[t] }))} />
            </Field>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Price (KES)">
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <PayoutPreview className="-mt-2" amount={kes(Number(price) || 0)} payee={personRef(me.id)} />
            {type !== 'MERCH' && <FileDrop label="Upload audio file" hint="MP3 or WAV (prototype: not really uploaded)" files={files} onChange={setFiles} accept="audio/*" />}
            <Button block disabled={!title.trim() || !Number(price)} onClick={() => setUploading(true)}>Publish</Button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit price"
        footer={<Button onClick={() => { if (editing) { updateContentPrice(editing.id, kes(Number(editing.price))); toast('Price updated'); } setEditing(null); }}>Save</Button>}
      >
        <Field label="Price (KES)">
          <Input inputMode="numeric" value={editing?.price ?? ''} onChange={(e) => editing && setEditing({ ...editing, price: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <PayoutPreview className="mt-2" amount={kes(Number(editing?.price) || 0)} payee={personRef(me.id)} />
      </Modal>
    </div>
  );
}
