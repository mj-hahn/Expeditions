import { Base } from "./Base";
import { Captions } from "./Captions";
import { Markers } from "./Markers";
import { Pins } from "./Pins";
import { Routes } from "./Routes";
import { ShipItasca } from "./ShipItasca";
import { TeamPulse } from "./TeamPulse";
import type { Layer } from "./types";

/**
 * Drawn bottom to top, and label space is claimed in this order: stop labels, ship, Itasca, pins, Phoenix, captions.
 * To add a map feature, write a file in this folder and add it here.
 */
export const LAYERS: Layer[] = [Base, Routes, Markers, ShipItasca, Pins, Captions, TeamPulse];
