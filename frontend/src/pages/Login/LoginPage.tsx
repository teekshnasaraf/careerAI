import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import axios from "axios";

import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";

import {
  loginSchema,
  type LoginFormData,
} from "../../validators/auth";

import { loginUser } from "../../features/auth/auth.service";
import { useAuth } from "../../context/useAuth";

function LoginPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setServerError("");

      const response = await loginUser({
        email: data.email,
        password: data.password,
      });

      localStorage.setItem(
        "careerai_token",
        response.data.token
      );

      await refreshUser();

      alert("Login Successful!");

      navigate("/dashboard");
      
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as {
          message?: string;
          errors?: Record<string, string[]>;
        };

        const firstFieldError = responseData?.errors
          ? Object.values(responseData.errors).flat()[0]
          : undefined;

        setServerError(
          responseData?.message ||
            firstFieldError ||
            "Invalid email or password"
        );
      } else {
        setServerError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        Welcome Back
      </h1>

      <p className="mb-8 text-gray-500">
        Sign in to continue to CareerAI.
      </p>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <Input
          label="Email"
          type="email"
          placeholder="john@example.com"
          {...register("email")}
          error={errors.email?.message}
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          {...register("password")}
          error={errors.password?.message}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Remember me
          </label>

          <Link
            to="/forgot-password"
            className="font-medium text-blue-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing In..." : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-blue-600 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;