import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import {
  loginSchema,
  type LoginFormData,
} from "../../validators/auth";

function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    console.log(data);
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        Welcome Back
      </h1>

      <p className="mb-8 text-gray-500">
        Sign in to continue to CareerAI.
      </p>

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

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          error={errors.password?.message}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              className="rounded border-gray-300"
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

        <Button type="submit">
          Login
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