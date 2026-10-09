// PlotMapper's service layer (services/*.js) pointed at NRI's API. Method
// names are kept so the ported editor and viewer call them unchanged.
import api, { errMsg } from '../api/client.js';

// Every endpoint answers { data }. Failures become an Error with a readable message.
const unwrap = (promise) => promise.then((res) => res.data.data).catch((e) => {
  const error = new Error(errMsg(e));
  error.status = e.response?.status;
  throw error;
});

/** The map of one listing: `{ project, floors }` (PlotMapper's project + floors). */
export const mapService = {
  get: (propertyId) => unwrap(api.get(`/plot-maps/property/${propertyId}`)),
  save: (propertyId, payload) => unwrap(api.put(`/plot-maps/property/${propertyId}`, payload)),
  remove: (propertyId) => unwrap(api.delete(`/plot-maps/property/${propertyId}`)),
  publish: (mapId) => unwrap(api.post(`/plot-maps/${mapId}/publish`)),
  unpublish: (mapId) => unwrap(api.post(`/plot-maps/${mapId}/unpublish`)),
  public: (propertyIdOrSlug) => unwrap(api.get(`/plot-maps/public/property/${propertyIdOrSlug}`)),
};

export const projectService = { publish: mapService.publish, unpublish: mapService.unpublish };

/** Each call returns the map's full floor list. */
export const floorService = {
  create: (mapId, payload) => unwrap(api.post(`/plot-maps/${mapId}/floors`, payload)).then((d) => d.floors),
  update: (mapId, floorId, payload) => unwrap(api.put(`/plot-maps/${mapId}/floors/${floorId}`, payload)).then((d) => d.floors),
  remove: (mapId, floorId) => unwrap(api.delete(`/plot-maps/${mapId}/floors/${floorId}`)),
};

/** Plots / flats — PlotMapper calls each mapped shape a "property". */
export const propertyService = {
  list: (mapId, params) => unwrap(api.get(`/plot-maps/${mapId}/units`, { params })),
  create: (mapId, payload) => unwrap(api.post(`/plot-maps/${mapId}/units`, payload)),
  update: (id, payload) => unwrap(api.put(`/plot-maps/units/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/plot-maps/units/${id}`)),
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5; // the limit of NRI's /api/upload

export const validateImageFile = (file) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `${file.name}: only JPG, PNG or WEBP images are allowed`;
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) return `${file.name}: larger than ${MAX_IMAGE_SIZE_MB} MB`;
  return null;
};

async function uploadImages(files, onProgress) {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  const urls = await api
    .post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    })
    .then((res) => res.data.urls)
    .catch((e) => { throw new Error(errMsg(e, 'Upload failed')); });
  return urls.map((url) => ({ url, publicId: '' }));
}

export const uploadService = {
  uploadPropertyImages: uploadImages,
  uploadImage: (file, onProgress) => uploadImages([file], onProgress).then(([image]) => image),
};
