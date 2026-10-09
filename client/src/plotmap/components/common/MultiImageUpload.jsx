import { useRef, useState } from 'react';
import usePlotToast from '../../toast';
import { ImagePlus, X } from 'lucide-react';
import { uploadService, validateImageFile } from '../../services';
import { MAX_PROPERTY_IMAGES } from '../../utils/constants';
import { Spinner } from './Feedback';

/** Gallery uploader for property photos. value: [{ url, publicId }] */
export default function MultiImageUpload({ value = [], onChange, label = 'Property images' }) {
  const toast = usePlotToast();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    const remaining = MAX_PROPERTY_IMAGES - value.length;
    if (remaining <= 0) return toast.error(`Maximum ${MAX_PROPERTY_IMAGES} images`);

    const valid = [];
    files.slice(0, remaining).forEach((file) => {
      const error = validateImageFile(file);
      if (error) toast.error(error);
      else valid.push(file);
    });
    if (!valid.length) return;

    setProgress(0);
    try {
      const uploaded = await uploadService.uploadPropertyImages(valid, setProgress);
      onChange([...value, ...uploaded]);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div>
      <p className="pm-label">
        {label} <span className="font-normal text-slate-400">({value.length}/{MAX_PROPERTY_IMAGES})</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {value.map((image, index) => (
          <div key={image.url} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
            <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < MAX_PROPERTY_IMAGES && (
          <button
            type="button"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
          >
            {progress !== null ? (
              <>
                <Spinner size={16} />
                <span className="text-[10px]">{progress}%</span>
              </>
            ) : (
              <>
                <ImagePlus size={18} />
                <span className="text-[10px] font-medium">Add</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        hidden
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
