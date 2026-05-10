import React, {useCallback, useState, type ReactNode} from "react";
import {RightPanelContext} from "./RightPanelContext";

export const RightPanelProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [panelContent, setPanelContent] = useState<ReactNode | null>(null);
  const [panelWidth, setPanelWidth] = useState(0);

  const setPanel = useCallback((content: ReactNode, width = 380) => {
    setPanelContent(content);
    setPanelWidth(width);
  }, []);

  const clearPanel = useCallback(() => {
    setPanelContent(null);
    setPanelWidth(0);
  }, []);

  return (
    <RightPanelContext.Provider
      value={{panelContent, panelWidth, setPanel, clearPanel}}
    >
      {children}
    </RightPanelContext.Provider>
  );
};
