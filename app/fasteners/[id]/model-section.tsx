'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Fastener } from '@/lib/types';

interface ModelSectionProps {
  fastener: Fastener;
  modelExists: boolean;
}

export function ModelSection({ fastener, modelExists }: ModelSectionProps) {
  const [showToast, setShowToast] = useState(false);

  const copyModelUrl = () => {
    const url = `${window.location.origin}/models/${fastener.id}.stl`;
    navigator.clipboard.writeText(url);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <>
      <div className="border-t border-border pt-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Simplified 3D model</CardTitle>
              <Badge variant="secondary" className="text-xs">Simplified STL</Badge>
            </div>
            <CardDescription>
              Approximate geometry from catalog dims for agent/CAD drop-in. Not for certification or fit-critical use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {modelExists ? (
              <>
                <div className="flex gap-2">
                  <a 
                    href={`/models/${fastener.id}.stl`}
                    download={`${fastener.designation}.stl`}
                    className="inline-flex items-center"
                  >
                    <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                      Download STL
                    </Button>
                  </a>
                  <Button 
                    variant="outline"
                    onClick={copyModelUrl}
                  >
                    Copy model URL
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Import in Onshape via File → Import (or any CAD). API push comes later.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Model not generated yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-foreground text-background px-4 py-2 rounded-md shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          Copied
        </div>
      )}
    </>
  );
}
