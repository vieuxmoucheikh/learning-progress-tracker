import { toast } from "@/components/ui/use-toast";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export const useToast = () => {
  return {
    toast: (options: ToastOptions) => {
      toast(options);
    },
  };
};
