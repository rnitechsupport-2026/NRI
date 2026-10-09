/**
 * Single source of truth for property status colors.
 * Change a color here and it updates the editor, tables, badges, public map and embedded map.
 */
export const statusConfig = {
  AVAILABLE: {
    label: 'Available',
    color: '#16a34a',
    fillOpacity: 0.28,
    hoverOpacity: 0.5,
    selectedOpacity: 0.6,
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dotClass: 'bg-emerald-500',
  },
  RESERVED: {
    label: 'Reserved',
    color: '#f59e0b',
    fillOpacity: 0.3,
    hoverOpacity: 0.52,
    selectedOpacity: 0.62,
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dotClass: 'bg-amber-500',
  },
  BOOKED: {
    label: 'Booked',
    color: '#2563eb',
    fillOpacity: 0.28,
    hoverOpacity: 0.5,
    selectedOpacity: 0.6,
    badgeClass: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    dotClass: 'bg-blue-500',
  },
  SOLD: {
    label: 'Sold',
    color: '#dc2626',
    fillOpacity: 0.28,
    hoverOpacity: 0.5,
    selectedOpacity: 0.6,
    badgeClass: 'bg-red-50 text-red-700 ring-red-600/20',
    dotClass: 'bg-red-500',
  },
};

export const PROPERTY_STATUS_CONFIG = statusConfig;

export const STATUS_KEYS = Object.keys(statusConfig);

export const getStatus = (status) => statusConfig[status] || statusConfig.AVAILABLE;

/**
 * { total, AVAILABLE, RESERVED, BOOKED, SOLD } counted from the given plots/flats.
 * Statistics are always derived like this (or by the API), never typed in or stored.
 */
export const countByStatus = (properties = []) =>
  STATUS_KEYS.reduce((counts, key) => ({ ...counts, [key]: properties.filter((p) => p.status === key).length }), {
    total: properties.length,
  });

// Adds several count objects together, e.g. every floor of a project.
export const sumCounts = (list = []) =>
  ['total', ...STATUS_KEYS].reduce((sum, key) => ({ ...sum, [key]: list.reduce((n, counts) => n + (counts?.[key] || 0), 0) }), {});

// Color used for shapes that are being drawn or are not saved yet.
export const DRAFT_COLOR = '#4f46e5';
