import { CopilotPopup } from "@copilotkit/react-ui";
import React from "react";
import "@copilotkit/react-ui/styles.css";

const MainLayout = ({ children }) => {
  return (
    <div className="container mx-auto " suppressHydrationWarning>
      <main>{children}</main>
      {/* <div style={{ width: 400, height: 600, overflow: "auto" }}>
        <CopilotPopup 
              labels={{
                title: "Credify",
                initial: "Welcome to Credify!!👋 How can I assist you today?",
              }}
            />
      </div> */}
    </div>
  );
};

export default MainLayout;
