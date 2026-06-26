import { createBrowserRouter } from "react-router-dom";
import LandingPage from "../pages/Landing/LandingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
]);