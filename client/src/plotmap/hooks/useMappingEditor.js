import { useCallback, useMemo, useReducer } from 'react';
import { pointsEqual, roundPoint, clampPoint } from '../utils/geometry';

/**
 * All polygon-editing logic lives here, separate from the UI.
 *
 * items    – the properties shown on this image (each has a normalized `polygon`)
 * saved    – polygon of each item as it is stored on the server (for "reset" and dirty checks)
 * draft    – points of the polygon currently being drawn
 * redrawId – when set, the finished draft replaces this item's polygon instead of creating a new item
 * past / future – undo/redo stacks of { draft, polygons } snapshots
 */

const MAX_HISTORY = 100;

const initialState = {
  items: [],
  saved: {},
  selectedId: null,
  selectedVertex: null,
  mode: 'select', // 'select' | 'draw' | 'edit' | 'delete'
  draft: [],
  redrawId: null,
  past: [],
  future: [],
};

const takeSnapshot = (state) => ({
  draft: state.draft,
  polygons: Object.fromEntries(state.items.map((item) => [item._id, item.polygon])),
});

const pushHistory = (state) => ({
  ...state,
  past: [...state.past.slice(-(MAX_HISTORY - 1)), takeSnapshot(state)],
  future: [],
});

const applySnapshot = (state, snapshot) => ({
  ...state,
  draft: snapshot.draft,
  selectedVertex: null,
  items: state.items.map((item) =>
    snapshot.polygons[item._id] ? { ...item, polygon: snapshot.polygons[item._id] } : item
  ),
});

const setItemPolygon = (items, id, polygon) => items.map((item) => (item._id === id ? { ...item, polygon } : item));

const getPolygon = (state, id) => state.items.find((item) => item._id === id)?.polygon || [];

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return {
        ...initialState,
        items: action.items,
        saved: Object.fromEntries(action.items.map((item) => [item._id, item.polygon])),
      };

    case 'SET_MODE': {
      const leavingDraft = state.draft.length > 0;
      return {
        ...state,
        mode: action.mode,
        draft: [],
        redrawId: null,
        selectedVertex: null,
        // Draft points in the history make no sense outside draw mode.
        past: leavingDraft ? [] : state.past,
        future: leavingDraft ? [] : state.future,
      };
    }

    case 'SELECT':
      return { ...state, selectedId: action.id, selectedVertex: null };

    case 'ADD_POINT':
      return { ...pushHistory(state), draft: [...state.draft, roundPoint(clampPoint(action.point))] };

    case 'UNDO_POINT':
      return state.draft.length ? { ...pushHistory(state), draft: state.draft.slice(0, -1) } : state;

    case 'CANCEL_DRAFT':
      return { ...state, draft: [], redrawId: null, mode: 'select', past: [], future: [] };

    case 'COMPLETE_DRAFT': {
      if (state.draft.length < 3) return state;
      if (state.redrawId) {
        return {
          ...state,
          items: setItemPolygon(state.items, state.redrawId, state.draft),
          selectedId: state.redrawId,
          draft: [],
          redrawId: null,
          mode: 'select',
          past: [],
          future: [],
        };
      }
      const newItem = { ...action.defaults, _id: `new-${Date.now()}`, isNew: true, polygon: state.draft };
      return {
        ...state,
        items: [...state.items, newItem],
        selectedId: newItem._id,
        draft: [],
        mode: 'select',
        past: [],
        future: [],
      };
    }

    case 'START_REDRAW':
      return { ...state, mode: 'draw', redrawId: action.id, selectedId: action.id, draft: [], selectedVertex: null };

    case 'BEGIN_CHANGE':
      return pushHistory(state);

    case 'MOVE_VERTEX': {
      const polygon = getPolygon(state, action.id).map((p, i) =>
        i === action.index ? roundPoint(clampPoint(action.point)) : p
      );
      return { ...state, items: setItemPolygon(state.items, action.id, polygon) };
    }

    case 'INSERT_VERTEX': {
      const polygon = [...getPolygon(state, action.id)];
      polygon.splice(action.index, 0, roundPoint(clampPoint(action.point)));
      return { ...pushHistory(state), items: setItemPolygon(state.items, action.id, polygon), selectedVertex: action.index };
    }

    case 'DELETE_VERTEX': {
      const polygon = getPolygon(state, action.id);
      if (polygon.length <= 3) return state;
      return {
        ...pushHistory(state),
        items: setItemPolygon(state.items, action.id, polygon.filter((_, i) => i !== action.index)),
        selectedVertex: null,
      };
    }

    case 'SELECT_VERTEX':
      return { ...state, selectedVertex: action.index };

    case 'RESET_POLYGON': {
      const original = state.saved[action.id];
      if (!original) return state;
      return { ...pushHistory(state), items: setItemPolygon(state.items, action.id, original) };
    }

    case 'UNDO': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...applySnapshot(state, previous),
        past: state.past.slice(0, -1),
        future: [takeSnapshot(state), ...state.future],
      };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        ...applySnapshot(state, next),
        past: [...state.past, takeSnapshot(state)],
        future: rest,
      };
    }

    // After the server saves an item. tempId is the local "new-…" id for new items.
    case 'ITEM_SAVED': {
      const oldId = action.tempId || action.item._id;
      return {
        ...state,
        items: state.items.map((item) => (item._id === oldId ? action.item : item)),
        saved: { ...state.saved, [action.item._id]: action.item.polygon },
        selectedId: state.selectedId === oldId ? action.item._id : state.selectedId,
      };
    }

    case 'ITEM_REMOVED': {
      const saved = { ...state.saved };
      delete saved[action.id];
      return {
        ...state,
        items: state.items.filter((item) => item._id !== action.id),
        saved,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        selectedVertex: null,
      };
    }

    default:
      return state;
  }
}

export default function useMappingEditor() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      load: (items) => dispatch({ type: 'LOAD', items }),
      setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
      select: (id) => dispatch({ type: 'SELECT', id }),
      addPoint: (point) => dispatch({ type: 'ADD_POINT', point }),
      undoPoint: () => dispatch({ type: 'UNDO_POINT' }),
      cancelDraft: () => dispatch({ type: 'CANCEL_DRAFT' }),
      completeDraft: (defaults) => dispatch({ type: 'COMPLETE_DRAFT', defaults }),
      startRedraw: (id) => dispatch({ type: 'START_REDRAW', id }),
      beginChange: () => dispatch({ type: 'BEGIN_CHANGE' }),
      moveVertex: (id, index, point) => dispatch({ type: 'MOVE_VERTEX', id, index, point }),
      insertVertex: (id, index, point) => dispatch({ type: 'INSERT_VERTEX', id, index, point }),
      deleteVertex: (id, index) => dispatch({ type: 'DELETE_VERTEX', id, index }),
      selectVertex: (index) => dispatch({ type: 'SELECT_VERTEX', index }),
      resetPolygon: (id) => dispatch({ type: 'RESET_POLYGON', id }),
      undo: () => dispatch({ type: 'UNDO' }),
      redo: () => dispatch({ type: 'REDO' }),
      itemSaved: (item, tempId) => dispatch({ type: 'ITEM_SAVED', item, tempId }),
      itemRemoved: (id) => dispatch({ type: 'ITEM_REMOVED', id }),
    }),
    []
  );

  const selectedItem = state.items.find((item) => item._id === state.selectedId) || null;

  // Saved items whose shape differs from the server copy.
  const dirtyIds = useMemo(
    () => state.items.filter((item) => !item.isNew && !pointsEqual(item.polygon, state.saved[item._id])).map((item) => item._id),
    [state.items, state.saved]
  );
  const newItemIds = useMemo(() => state.items.filter((item) => item.isNew).map((item) => item._id), [state.items]);

  const isDirty = useCallback((id) => dirtyIds.includes(id), [dirtyIds]);

  return {
    ...state,
    ...actions,
    selectedItem,
    dirtyIds,
    newItemIds,
    isDirty,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
