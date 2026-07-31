import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

import Input from "../../components/ui/Input";
import PasswordInput from "../../components/ui/PasswordInput";
import Button from "../../components/ui/Button";

import {
  registerSchema,
  type RegisterFormData,
} from "../../validators/auth";

import { registerUser } from "../../features/auth/auth.service";

function RegisterPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true);
      setServerError("");

      await registerUser({
        fullName: data.name,
        email: data.email,
        password: data.password,
      });

      alert("Registration Successful!");

      navigate("/login");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        Create Account
      </h1>

      <p className="mb-8 text-gray-500">
        Start your AI-powered career journey today.
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
          label="Full Name"
          type="text"
          placeholder="John Doe"
          {...register("name")}
          error={errors.name?.message}
        />

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

        <PasswordInput
          label="Confirm Password"
          placeholder="••••••••"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-600 hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;