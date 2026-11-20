import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-line">
      <div className="max-w-[1504px] mx-auto px-4 sm:px-6 xl:px-8 py-6 flex items-center gap-3">
        <Image src="/lulu-logo.png" alt="" width={34} height={34} className="size-8 object-contain" />
        <div>
          <p className="text-sm font-semibold text-ink">LuluTV</p>
          <p className="mt-1 text-xs text-muted">© 2026 LuluTV · 开源多源影视播放工具</p>
        </div>
      </div>
    </footer>
  );
};
