/** Global film grain, vignette and drifting fog. Purely decorative, CSS only. */
export function Atmosphere() {
  return (
    <>
      <div className="fog-layer" aria-hidden="true" />
      <div className="fog-layer b" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
