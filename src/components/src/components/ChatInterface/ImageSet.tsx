import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ImageSet({ message_id }: { message_id: string }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Grab current session to get userId
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase.functions.invoke("image-registry", {
          body: {
            action: "get",
            userId: session.user.id,
            message_id,
          },
        });
        if (error || !data?.success) {
          setError(data?.error || "Failed to retrieve images");
          return;
        }
        setUrls(data.urls || []);
      } catch (err: any) {
        console.error("Error fetching image-urls:", err);
        setError("Failed to retrieve images");
      }
    })();
  }, [message_id]);

  if (error) {
    return <div className="mt-2 text-sm text-red-500">Unable to load images: {error}</div>;
  }
  if (!urls) {
    return <div className="mt-2 text-sm text-gray-400">Loading images...</div>;
  }
  if (!urls.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {urls.map((u, i) => (
        <ImageMessage key={i} src={u} />
      ))}
    </div>
  );
}

function ImageMessage({ src }: { src: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="relative w-full max-w-[300px] rounded-2xl bg-gray-50/80 backdrop-blur-sm p-4 text-sm text-gray-500 text-center">
        Unable to load image
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[300px] my-1">
      {!isLoaded && (
        <div
          className="absolute inset-0 image-skeleton rounded-2xl"
          style={{ aspectRatio: "9/16" }}
        />
      )}
      <img
        src={src}
        alt="Generated"
        className={`w-full rounded-2xl transition-all duration-300 ${
          isLoaded ? "loaded" : "opacity-0"
        }`}
        style={{ aspectRatio: "9/16" }}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
}
