import { slabMarkup, type SlabInput } from "@/lib/slab";

export function Slab(input: SlabInput & { pulled?: boolean }) {
  return (
    <div className={input.pulled ? "slab-card pulled" : "slab-card"} dangerouslySetInnerHTML={{ __html: slabMarkup(input) }} />
  );
}
