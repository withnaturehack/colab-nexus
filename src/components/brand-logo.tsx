import logo from "@/assets/colab-nation-logo.jpg.asset.json";

type Props = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  tagline?: boolean;
};

export function BrandLogo({ size = 40, className = "", withWordmark = false, tagline = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative overflow-hidden rounded-xl ring-1 ring-white/10 shadow-glow"
        style={{ width: size, height: size, background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), transparent 70%)" }}
      >
        <img
          src={logo.url}
          alt="CoLab Nation"
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>
      {withWordmark && (
        <div className="leading-tight">
          <div className="font-display text-sm font-semibold tracking-tight">CoLab Nation</div>
          {tagline ? (
            <div className="text-[10px] uppercase tracking-[0.18em] gradient-text">Powering Ideas into Reality</div>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</div>
          )}
        </div>
      )}
    </div>
  );
}

export const brandLogoUrl = logo.url;
