import { useEffect, useState } from 'react';
import apiClient from '@/api/client';

// <img src> can't carry the Authorization header the /api/files/* routes
// require, so this fetches the image as a blob and renders it via an
// object URL instead. Renders nothing while loading or on failure.
const AuthedImage = ({ apiPath, alt, className }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    apiClient
      .get(apiPath, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiPath]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
};

export default AuthedImage;
