declare module 'lucide-react' {
  import type { SVGProps } from 'react';

  export type LucideIcon = (props: SVGProps<SVGSVGElement> & { size?: number | string }) => JSX.Element;

  export const Camera: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Trash2: LucideIcon;
  export const Video: LucideIcon;
  export const VideoOff: LucideIcon;
}
