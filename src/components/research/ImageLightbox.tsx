// Fullscreen image zoom for article images (ported from Curve's lightbox).
// Clicking an image in the reading body opens it here at full size over a dimmed
// backdrop; clicking anywhere or pressing Escape closes it. Rendered only when a
// src is set, so it costs nothing while closed.

import { useEffect } from "react";
import { Icons } from "../../icons/icons";

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  // Escape closes; only bound while open.
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="rc-lightbox"
      onClick={onClose}
      data-testid="research-image-lightbox">
      <button className="rc-lightbox-close" onClick={onClose} title="关闭">
        <Icons.x size={20} />
      </button>
      <img
        className="rc-lightbox-img"
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
