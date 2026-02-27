"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic"; // Import dynamic
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Dynamically import CopilotChat and disable SSR for it
const CopilotChat = dynamic(
  () => import("@copilotkit/react-ui").then((mod) => mod.CopilotChat),
  { ssr: false }
);

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist%404.4.168/legacy/build/pdf.worker.min.js`;

function EducationContent() {
  const [pdfText, setPdfText] = useState("");

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument("/book.pdf").promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(" ") + "\n";
        }
        setPdfText(text);
      } catch (e) { console.error("PDF Error:", e); }
    };
    loadPdf();
  }, []);

  useCopilotReadable({
    description: "The content of the educational book",
    value: pdfText,
  });

  return (
    <div className="flex flex-col h-screen p-8">
      <h1 className="text-2xl font-bold">Educational Portal</h1>
      <p>{pdfText ? "✅ PDF Loaded" : "⏳ Reading PDF..."}</p>
      
      <div className="bottom-0 fixed left-0 right-0">
        {/* This component will now only mount AFTER the Provider is ready */}
        <CopilotChat
          labels={{
            title: "Credify Assistant",
            initial: "I've read the book. How can I help?",
          }}
        />
      </div>
    </div>
  );
}

export default function EducationPage() {
  return (
    <CopilotKit runtimeUrl="/api/copilot">
      <EducationContent />
    </CopilotKit>
  );
}