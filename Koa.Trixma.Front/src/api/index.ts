export type {
  System,
  Unit,
  MeasurementDataPoint,
  MeasurementGroup,
  TrixmaResponse,
} from "./types";

export * as systemsApi from "./systems";
export * as unitsApi from "./units";

// Backwards-compatible `trixma` object for consumers that haven't migrated yet
import * as systems from "./systems";
import * as units from "./units";

export const trixma = {...systems, ...units};
