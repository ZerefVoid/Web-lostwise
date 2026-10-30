import { createContext } from 'react';

// Holds { setDlg, toast } so any page can open dialogs and toasts
export const Ctx = createContext({});
