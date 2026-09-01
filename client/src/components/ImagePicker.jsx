import { useRef, useState } from 'react';
import api, { errMsg } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Upload, X, Plus } from './Icons.jsx';

/**
 * Image list editor. Accepts real file uploads (multipart → /api/upload) and
 * pasted image URLs, since demo data uses remote images. First image = cover.
 */
export default function ImagePicker({ value = [], onChange, max = 12 }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');

  async function upload(files) {
    const list = Array.from(files || []).slice(0, max - value.length);
    if (!list.length) return;
    const fd = new FormData();
    list.forEach((f) => fd.append('images', f));
    setBusy(true);
    try {
      const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange([...value, ...data.urls].slice(0, max));
      toast.success(`${data.urls.length} image(s) uploaded`);
    } catch (e) {
      toast.error(errMsg(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  function addUrl(e) {
    e.preventDefault();
    const clean = url.trim();
    if (!clean) return;
    if (!/^https?:\/\//i.test(clean)) { toast.error('Enter a full image URL starting with https://'); return; }
    onChange([...value, clean].slice(0, max));
    setUrl('');
  }

  const remove = (i) => onChange(value.filter((_, k) => k !== i));
  const makeCover = (i) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    onChange([item, ...next]);
  };

  return (
    <div>
      <div
        className={`uploader ${drag ? 'drag' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
      >
        <Upload />
        <div className="strong small">
          {busy ? 'Uploading…' : 'Drag photos here or click to browse'}
        </div>
        <div className="tiny muted">JPG, PNG or WEBP · up to 5 MB each · max {max} photos</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
               onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </div>

      <form className="row mt-2" style={{ gap: 8 }} onSubmit={addUrl}>
        <input className="input" placeholder="…or paste an image URL" value={url}
               onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" type="submit"><Plus /> Add</button>
      </form>

      {value.length > 0 && (
        <>
          <div className="thumbs">
            {value.map((src, i) => (
              <div className="thumb" key={`${src}-${i}`}>
                <img src={src} alt="" />
                <button type="button" onClick={() => remove(i)} aria-label="Remove photo"><X /></button>
                {i === 0
                  ? <span className="cover-tag">COVER</span>
                  : (
                    <button type="button" onClick={() => makeCover(i)}
                            className="cover-tag"
                            style={{ position: 'absolute', left: 5, bottom: 5, top: 'auto', right: 'auto', width: 'auto', height: 'auto', borderRadius: 'var(--r-full)', background: 'rgba(6,15,38,.75)', color: '#fff', padding: '2px 7px' }}>
                      Set cover
                    </button>
                  )}
              </div>
            ))}
          </div>
          <p className="tiny muted mt-1">{value.length} of {max} photos · the first image is used as the cover.</p>
        </>
      )}
    </div>
  );
}
