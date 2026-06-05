import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import ErrorDialog from './ErrorDialog';

type ErrorDialogPayload = {
  title?: string;
  message: string;
};

type ErrorDialogContextValue = {
  showError: (payload: ErrorDialogPayload) => void;
};

const ErrorDialogContext = createContext<ErrorDialogContextValue | undefined>(undefined);

export function ErrorDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ErrorDialogPayload | null>(null);

  const showError = useCallback(({ title = 'Error', message }: ErrorDialogPayload) => {
    setDialog({ title, message });
  }, []);

  const dismiss = useCallback(() => setDialog(null), []);

  const contextValue = useMemo(() => ({ showError }), [showError]);

  return (
    <ErrorDialogContext.Provider value={contextValue}>
      {children}
      <ErrorDialog
        visible={!!dialog}
        title={dialog?.title ?? 'Error'}
        message={dialog?.message ?? ''}
        onDismiss={dismiss}
      />
    </ErrorDialogContext.Provider>
  );
}

export function useErrorDialog() {
  const context = useContext(ErrorDialogContext);
  if (!context) {
    throw new Error('useErrorDialog must be used within ErrorDialogProvider');
  }
  return context;
}
