import { useStore } from '../store/useStore'

export function useToast() {
  return useStore((s) => s.showToast)
}