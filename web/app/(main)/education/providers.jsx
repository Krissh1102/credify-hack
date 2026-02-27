"use client";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export function CopilotProvider({ children }) {
  return (
    <CopilotKit runtimeUrl="/api/copilot">
      {children}
    </CopilotKit>
  );
}