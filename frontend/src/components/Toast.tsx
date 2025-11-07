import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "border-green-500 bg-green-500/10 text-green-400";
      case "error":
        return "border-red-500 bg-red-500/10 text-red-400";
      case "warning":
        return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
      case "info":
        return "border-blue-500 bg-blue-500/10 text-blue-400";
      default:
        return "border-gray-500 bg-gray-500/10 text-gray-400";
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "";
    }
  };

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${getStyles()}`}
    >
      <span className="text-lg font-bold">{getIcon()}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="text-current opacity-60 hover:opacity-100"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
};

// Global toast state
let toastIdCounter = 0;
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let currentToasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...currentToasts]));
};

export const toast = {
  show: (message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${toastIdCounter++}`;
    const newToast: Toast = { id, message, type, duration };
    currentToasts = [...currentToasts, newToast];
    notifyListeners();
    return id;
  },
  success: (message: string, duration?: number) =>
    toast.show(message, "success", duration),
  error: (message: string, duration?: number) =>
    toast.show(message, "error", duration),
  info: (message: string, duration?: number) =>
    toast.show(message, "info", duration),
  warning: (message: string, duration?: number) =>
    toast.show(message, "warning", duration),
  remove: (id: string) => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    notifyListeners();
  },
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts(newToasts);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={toast.remove} />
      ))}
    </div>
  );
};
