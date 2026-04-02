import { env } from "@/lib/env";

export function Logo({ className }: { className?: string }) {
  const [primaryWord, ...rest] = env.APP_NAME.split(" ");
  const secondaryWord = rest.join(" ");

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Hexagon Outline */}
        <polygon
          points="50,6 90,29 90,71 50,94 10,71 10,29"
          fill="none"
          stroke="#10B981"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        {/* Stylized TC Text */}
        <text
          x="48"
          y="66"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="44"
          fill="currentColor"
          textAnchor="middle"
          letterSpacing="-1.5"
        >
          TC
        </text>
      </svg>
      <div className="flex flex-col pt-0.5" style={{ color: "currentColor" }}>
        <span className="text-[19px] font-bold leading-none tracking-tight">
          {primaryWord}
        </span>
        {secondaryWord && (
          <span className="text-[14px] font-medium leading-tight tracking-[0.02em] opacity-80">
            {secondaryWord}
          </span>
        )}
      </div>
    </div>
  );
}
