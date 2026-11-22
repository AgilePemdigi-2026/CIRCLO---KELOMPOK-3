"use client";

import { useEffect, useState } from "react";

const FALLBACK_STYLE =
  "w-full h-full flex items-center justify-center bg-[#e5f0f8] text-[#4d7c0f]";

let imageDataPromise = null;

function loadImageData() {
  if (!imageDataPromise) {
    imageDataPromise = fetch("/data/material_images.json")
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
  }
  return imageDataPromise;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFallback(category) {
  const slug = String(category || "lainnya")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/images/materials/${slug || "lainnya"}.svg`;
}

function resolveImage(data, { materialId, materialName, category, imageUrl }) {
  if (imageUrl) return imageUrl;

  const entry = data?.materials?.[String(materialId || "")];
  if (entry?.image_url) return entry.image_url;

  const name = normalize(materialName);
  const exact = data?.exact_images?.[name];
  if (exact?.url) return exact.url;

  for (const rule of data?.keyword_rules || []) {
    if (rule.words?.some((word) => name.includes(normalize(word)))) {
      return rule.url;
    }
  }

  return data?.category_images?.[category]?.url || categoryFallback(category);
}

export default function MaterialImage({
  materialId,
  materialName = "",
  category = "",
  imageUrl,
  imageAlt,
  className = "",
  imageClassName = "object-cover",
}) {
  const [resolved, setResolved] = useState(imageUrl || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (imageUrl) {
      setResolved(imageUrl);
      return () => {
        active = false;
      };
    }

    loadImageData().then((data) => {
      if (active) {
        setResolved(
          resolveImage(data, { materialId, materialName, category, imageUrl }),
        );
      }
    });

    return () => {
      active = false;
    };
  }, [materialId, materialName, category, imageUrl]);

  if (!resolved || failed) {
    return (
      <div className={`${FALLBACK_STYLE} ${className}`}>
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-label="Gambar material belum tersedia"
          role="img"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={resolved}
        alt={imageAlt || `Gambar ${materialName || category || "material"}`}
        className={`w-full h-full ${imageClassName}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
