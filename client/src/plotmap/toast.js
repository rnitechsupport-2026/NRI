import { useMemo } from 'react';
import { useToast } from '../context/ToastContext.jsx';

/** PlotMapper's components call `toast(...)`, `toast.success(...)` and
 *  `toast.error(...)` (react-hot-toast). This gives them the same calls on
 *  top of NRI's own toasts, so there is one toast stack on screen. */
export default function usePlotToast() {
  const toast = useToast();
  return useMemo(
    () => Object.assign((message) => toast.info(message), { success: toast.success, error: toast.error }),
    [toast]
  );
}
