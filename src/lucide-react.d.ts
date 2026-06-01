declare module 'lucide-react' {
  import type { SVGProps } from 'react';

  export type LucideIcon = (props: SVGProps<SVGSVGElement> & { size?: number | string }) => JSX.Element;

  export const Camera: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Eye: LucideIcon;
  export const Sparkles: LucideIcon;
}
