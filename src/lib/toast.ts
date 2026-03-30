import toast from "react-hot-toast";

export function notifySuccess(message: string) {
  return toast.success(message);
}

export function notifyError(message: string) {
  return toast.error(message);
}

export function notifyWarning(message: string) {
  return toast(message, {
    icon: "⚠️"
  });
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId?: string) {
  if (toastId) {
    toast.dismiss(toastId);
    return;
  }

  toast.dismiss();
}
