import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LandingPage from "../pages/Landing/LandingPage";
import AuthLayout from "../layouts/AuthLayout";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
    ],
  },
]);