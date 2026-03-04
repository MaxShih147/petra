"use client";

interface FossilCardProps {
  name: string;
  genus: string;
  onClick: () => void;
}

export default function FossilCard({ name, genus, onClick }: FossilCardProps) {
  // Take first 2 letters of genus as abbreviation
  const abbr = genus.slice(0, 2).toUpperCase();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-1"
    >
      <div className="relative w-14 h-14 bg-petra-parchment border-2 border-petra-sand rounded-lg shadow-card group-hover:shadow-card-hover group-hover:border-petra-sienna transition-all duration-300 flex items-center justify-center overflow-hidden">
        {/* Paper grain texture overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+')]" />

        {/* Genus abbreviation */}
        <span className="font-display text-lg font-bold text-petra-sepia group-hover:text-petra-sienna transition-colors duration-300 relative z-10">
          {abbr}
        </span>

        {/* Corner decorations */}
        <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l border-petra-sand/60" />
        <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t border-r border-petra-sand/60" />
        <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l border-petra-sand/60" />
        <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-petra-sand/60" />
      </div>

      {/* Label below card */}
      <div className="mt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="font-display text-[9px] text-petra-sepia bg-petra-parchment/90 px-1.5 py-0.5 rounded border border-petra-sand/50 whitespace-nowrap shadow-sm italic">
          {name}
        </span>
      </div>
    </div>
  );
}
