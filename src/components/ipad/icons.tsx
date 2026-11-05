/**
 * Strich-Symbole aus dem iPad-Entwurf (docs/ui-redesign/reference), 24er-Raster.
 */

import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function icon(paths: ReactNode, defaultStroke = 1.75) {
  return function Icon({ size = 22, strokeWidth = defaultStroke, className }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        {paths}
      </svg>
    );
  };
}

export const NotebookIcon = icon(<><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 3v18" /><path d="M13 8h3M13 12h3" /></>);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const SlidersIcon = icon(<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></>);
export const SidebarIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>);
export const UndoIcon = icon(<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>);
export const RedoIcon = icon(<><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>);
export const CloudOffIcon = icon(<><path d="M3 3l18 18" /><path d="M7.6 7.6A5.5 5.5 0 0 0 7 18h10.5" /><path d="M10.8 5.3A5.5 5.5 0 0 1 17.4 9.4 4 4 0 0 1 20.5 14.5" /></>);
export const CloudIcon = icon(<path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 17.6 9.5 4.25 4.25 0 0 1 17.5 18z" />);
export const MoonIcon = icon(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />);
export const SunIcon = icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const ShareIcon = icon(<><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M5 13v6h14v-6" /></>);
export const DownloadIcon = icon(<><path d="M12 4v11" /><path d="M8 11l4 4 4-4" /><path d="M5 19h14" /></>);
export const CheckIcon = icon(<path d="M5 12l5 5 9-10" />);
export const FolderIcon = icon(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />);
export const ServerIcon = icon(<><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01" /></>);
export const ChevronRightIcon = icon(<path d="M9 6l6 6-6 6" />);
export const ChevronLeftIcon = icon(<path d="M15 6l-6 6 6 6" />);
export const MinusIcon = icon(<path d="M5 12h14" />);
export const TrashIcon = icon(<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></>);
export const RefreshIcon = icon(<><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>);
export const AlertIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>);

// Werkzeuge
export const SelectIcon = icon(<path d="M5 3l14 7-6 2-2 6z" />);
export const PenIcon = icon(<path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z" />);
export const HighlighterIcon = icon(<path d="M14 4l6 6-9 9H5v-6z" />);
export const EraserIcon = icon(<path d="M4 15l9-9a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-7 7H8z" />);
export const ShapesIcon = icon(<><rect x="3" y="3" width="10" height="10" rx="2" /><circle cx="16" cy="16" r="5" /></>);
export const TextIcon = icon(<path d="M5 6V4h14v2M12 4v16M9 20h6" />);
export const ImageIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></>);
export const RectangleIcon = icon(<rect x="4" y="6" width="16" height="12" rx="2" />);
export const EllipseIcon = icon(<ellipse cx="12" cy="12" rx="8.5" ry="6.5" />);
export const DiamondIcon = icon(<path d="M12 3l9 9-9 9-9-9z" />);
export const ArrowIcon = icon(<><path d="M5 19L19 5" /><path d="M10 5h9v9" /></>);
export const LineIcon = icon(<path d="M5 19L19 5" />);

// Instrumente und Funktionen
export const CloseIcon = icon(<path d="M6 6l12 12M18 6L6 18" />);
export const RulerIcon = icon(<><rect x="2.5" y="8" width="19" height="8" rx="1.5" /><path d="M6 8v3M9.5 8v2M13 8v3M16.5 8v2" /></>);
export const SetSquareIcon = icon(<><path d="M3 6h18L12 15z" /><path d="M8.5 6a3.5 3.5 0 0 0 7 0" /></>);
export const ParabolaIcon = icon(<><path d="M4 4c2 11 4 14 8 14s6-3 8-14" /><path d="M3 20h18" /></>);
export const CompassIcon = icon(<><circle cx="12" cy="4.5" r="1.5" /><path d="M11.2 6L6 20M12.8 6L18 20" /><path d="M8 15.5a8 8 0 0 0 8 0" /></>);
export const FunctionIcon = icon(<><path d="M4 20h16M4 20V4" /><path d="M6.5 17c3-9 5-9 6.5-5s3.5 4 6-5" /></>);
