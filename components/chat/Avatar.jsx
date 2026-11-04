import { Store } from 'lucide-react';
import { initials, isShopName } from '@/lib/chat/format';

// Foto bila ada; kalau tidak: ikon toko (nama usaha) atau inisial.
export default function Avatar({ name, src, size = 40 }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="shrink-0 rounded-full bg-white object-cover" />;
  }
  if (isShopName(name)) {
    return (
      <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-orange-500 text-white" aria-hidden="true">
        <Store style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }
  return (
    <span style={{ ...style, fontSize: size * 0.36 }} className="flex shrink-0 items-center justify-center rounded-full bg-circlo-soft font-semibold text-circlo-green" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
