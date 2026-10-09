/** Promise-based confirmation, same call shape as PlotMapper's ConfirmContext:
 *    const confirm = useConfirm();
 *    if (await confirm({ title: 'Delete?', message: '...' })) { ... }
 *  NRI has no app-wide confirm dialog to host it in, so this asks with the
 *  browser's own. */
const confirm = ({ title, message } = {}) =>
  Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n\n')));

export const useConfirm = () => confirm;
