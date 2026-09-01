import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
  type RefCallback,
} from "react";

interface AnchorRegistryValue {
  get(key: string): HTMLElement | null;
  ref(key: string): RefCallback<HTMLElement>;
}

const AnchorRegistryContext = createContext<AnchorRegistryValue | null>(null);

export function AnchorRegistryProvider({ children }: PropsWithChildren) {
  const anchors = useRef(new Map<string, HTMLElement>());
  const get = useCallback((key: string) => anchors.current.get(key) ?? null, []);
  const ref = useCallback(
    (key: string): RefCallback<HTMLElement> =>
      (node) => {
        if (node) anchors.current.set(key, node);
        else anchors.current.delete(key);
      },
    [],
  );
  const value = useMemo(() => ({ get, ref }), [get, ref]);
  return <AnchorRegistryContext.Provider value={value}>{children}</AnchorRegistryContext.Provider>;
}

export function useAnchorRef<T extends HTMLElement>(key: string): RefCallback<T> {
  const registry = useContext(AnchorRegistryContext);
  if (!registry) throw new Error("useAnchorRef must be used inside AnchorRegistryProvider.");
  return registry.ref(key) as RefCallback<T>;
}

export function useAnchorRegistry() {
  const registry = useContext(AnchorRegistryContext);
  if (!registry) throw new Error("useAnchorRegistry must be used inside AnchorRegistryProvider.");
  return registry;
}
