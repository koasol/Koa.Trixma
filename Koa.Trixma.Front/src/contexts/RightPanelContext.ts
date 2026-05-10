import {createContext, useContext, type ReactNode} from "react";

interface RightPanelContextValue {
  panelContent: ReactNode | null;
  panelWidth: number;
  setPanel: (content: ReactNode, width?: number) => void;
  clearPanel: () => void;
}

const RightPanelContext = createContext<RightPanelContextValue>({
  panelContent: null,
  panelWidth: 0,
  setPanel: () => {},
  clearPanel: () => {},
});

export {RightPanelContext};

export const useRightPanel = () => useContext(RightPanelContext);
