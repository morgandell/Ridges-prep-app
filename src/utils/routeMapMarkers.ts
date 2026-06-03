import { divIcon, DivIcon } from "leaflet";
import { RoutePoint } from "../types/route";
import { getRoutePointColor } from "./routePointColors";

export type RouteMarkerVariant = "start" | "end" | "campsite" | "view";

export function makeRoutePointMarkerIcon(
  color: string,
  displayNumber: number,
  variant: RouteMarkerVariant,
): DivIcon {
  const iconClass =
    variant === "campsite"
      ? "fa-solid fa-campground"
      : variant === "view"
        ? "fa-solid fa-binoculars"
        : "";
  const inner =
    variant === "campsite" || variant === "view"
      ? `<i class="${iconClass}" style="
          color: white;
          font-size: 14px;
          transform: rotate(45deg);
        "></i>`
      : `<span style="
          color: white;
          font-size: 12px;
          font-weight: 700;
          transform: rotate(45deg);
          line-height: 1;
        ">${displayNumber}</span>`;

  return divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${inner}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

export function getMarkerVariant(
  index: number,
  total: number,
  stopType?: RoutePoint["type"],
): RouteMarkerVariant {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return stopType === "campsite" ? "campsite" : "view";
}

export function getRoutePointMarkerIcon(
  index: number,
  total: number,
  stopType?: RoutePoint["type"],
): DivIcon {
  const color = getRoutePointColor(index, total);
  return makeRoutePointMarkerIcon(
    color,
    index + 1,
    getMarkerVariant(index, total, stopType),
  );
}
