import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "../app/page";
import ArchivePage from "../components/radio-archive/ArchivePage";
import "../app/globals.css";

const isArchive = window.location.pathname.startsWith(
  "/projects/mb4x-radio-archive",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isArchive ? <ArchivePage /> : <HomePage />}</StrictMode>,
);
