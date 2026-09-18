'use client';

import { Button } from '@/components/ui/button';

interface FastenerActionsProps {
  fastener: {
    id: string;
    designation: string;
    family: string;
    diameter: number;
    length_mm: number;
    thread: string;
    material: string;
    tensile_strength_mpa: number;
    coating: string;
    notes: string;
    capabilities: string[];
  };
}

export function FastenerActions({ fastener }: FastenerActionsProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(fastener, null, 2));
  };

  return (
    <div className="flex gap-4 pt-4 border-t border-border">
      <Button variant="outline" onClick={copyToClipboard}>
        Copy JSON
      </Button>
      <a href={`/api/fasteners/${fastener.id}`} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost">
          Open in API →
        </Button>
      </a>
    </div>
  );
}
