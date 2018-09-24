import React from "react";
import { Classification } from "../entities/Classification";
import { Label } from "../entities/Label";

export const { Provider, Consumer } = React.createContext<{
  classifications: Classification[];
  labels: Label[];
}>({
  classifications: [],
  labels: [],
});
