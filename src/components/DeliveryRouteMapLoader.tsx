"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`/`document` on import, so it can't be server-rendered - the plain
// picker (MapPinPicker) only ever mounts client-side inside a Dialog and never hit this; this
// map renders directly in the page flow, so it needs an explicit `ssr: false` dynamic import
// (which next/dynamic only allows from a Client Component, hence this thin wrapper).
export const DeliveryRouteMapLoader = dynamic(
  () => import("./DeliveryRouteMap").then((m) => m.DeliveryRouteMap),
  { ssr: false },
);
