import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const Avatar = ({ name, size = 36, bg, color, src }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset the failure flag if the caller swaps in a different image
  useEffect(() => { setImgFailed(false); }, [src]);

  // `name` can be an explicit null (e.g. an unassigned appointment's doctor_name) —
  // a default parameter only covers undefined, so guard here too.
  const safeName = name || '';

  const initials = safeName
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        onError={() => setImgFailed(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: bg || '#F0EEFF',
        color: color || (bg ? '#fff' : '#7C6EF8'),
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
};

Avatar.propTypes = {
  name: PropTypes.string,
  size: PropTypes.number,
  bg: PropTypes.string,
  color: PropTypes.string,
  src: PropTypes.string,
};

export default Avatar;
