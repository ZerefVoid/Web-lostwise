// Report photo (used on the detail page). "height" is optional.
export default function Photo({ r, height }) {
  const style = {
    ...(height ? { height: height, borderRadius: 12 } : {}),
    ...(r.photo_url ? { backgroundImage: `url(${r.photo_url})` } : {}),
  };

  return (
    <div className={'ph ' + (r.photo_url ? '' : 'no')} style={style}>
      {!r.photo_url && 'No photo'}
    </div>
  );
}
