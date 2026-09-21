'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Fastener } from '@/lib/types';

interface PlacementSectionProps {
  fastener: Fastener;
  modelExists: boolean;
  onshapeConfigured: boolean;
}

export function PlacementSection({ fastener, modelExists, onshapeConfigured }: PlacementSectionProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [insertStatus, setInsertStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [insertMessage, setInsertMessage] = useState('');
  const [insertUrl, setInsertUrl] = useState<string | null>(null);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const copyPlacementPacket = async () => {
    try {
      const response = await fetch(`/api/fasteners/${fastener.id}/placement`);
      const packet = await response.json();
      await navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
      showToastMessage('Copied');
    } catch (error) {
      showToastMessage('Copy failed');
    }
  };

  const openPlacementJson = () => {
    window.open(`/api/fasteners/${fastener.id}/placement`, '_blank');
  };

  const insertInOnshape = async () => {
    setInsertStatus('loading');
    setInsertMessage('');
    setInsertUrl(null);

    try {
      const response = await fetch('/api/adapters/onshape/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fastener.id }),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        setInsertStatus('success');
        setInsertMessage('Inserted successfully');
        setInsertUrl(result.elementUrl || null);
      } else {
        setInsertStatus('error');
        setInsertMessage(result.error || 'Insert failed — check Onshape keys / rate limit');
      }
    } catch (error) {
      setInsertStatus('error');
      setInsertMessage('Insert failed — network error');
    }
  };

  if (!modelExists) {
    return (
      <div className="border-t border-border pt-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Placement</CardTitle>
              <Badge variant="outline" className="text-xs">L1 · CAD-agnostic</Badge>
            </div>
            <CardDescription>
              Axis, origin, and grip for AI CAD agents. Insert at a frame you (or the agent) choose — not auto-mates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No model — placement packet unavailable
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gripLength = fastener.length_mm > 0 ? `${fastener.length_mm} mm` : '—';

  return (
    <>
      <div className="border-t border-border pt-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Placement</CardTitle>
              <Badge variant="outline" className="text-xs">L1 · CAD-agnostic</Badge>
            </div>
            <CardDescription>
              Axis, origin, and grip for AI CAD agents. Insert at a frame you (or the agent) choose — not auto-mates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground mb-1">Axis</dt>
                <dd className="font-mono text-sm">+Z along shank toward tip</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1">Origin</dt>
                <dd className="font-mono text-sm">Head bearing face center</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1">Grip</dt>
                <dd className="font-mono text-sm">{gripLength}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1">Head side</dt>
                <dd className="font-mono text-sm">+Z</dd>
              </div>
            </dl>

            <div className="flex gap-2 flex-wrap">
              <Button 
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                onClick={copyPlacementPacket}
              >
                Copy placement packet
              </Button>
              <Button 
                variant="ghost"
                onClick={openPlacementJson}
              >
                Open placement JSON
              </Button>
              {onshapeConfigured && (
                <Button 
                  variant="outline"
                  onClick={insertInOnshape}
                  disabled={insertStatus === 'loading'}
                >
                  {insertStatus === 'loading' ? 'Inserting...' : 'Insert in Onshape (at origin)'}
                </Button>
              )}
            </div>

            {onshapeConfigured && (
              <p className="text-xs text-muted-foreground">
                Experimental. Uses your connected Onshape test document. No mates.
              </p>
            )}

            {insertStatus === 'success' && (
              <div className="text-sm text-muted-foreground">
                {insertUrl ? (
                  <>
                    {insertMessage}.{' '}
                    <a 
                      href={insertUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#4F46E5] hover:underline"
                    >
                      Open in Onshape →
                    </a>
                  </>
                ) : (
                  insertMessage
                )}
              </div>
            )}

            {insertStatus === 'error' && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {insertMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-foreground text-background px-4 py-2 rounded-md shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </>
  );
}
