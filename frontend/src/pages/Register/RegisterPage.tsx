import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        Create Account
      </h1>

      <p className="mb-8 text-gray-500">
        Start your AI-powered career journey today.
      </p>

      <form className="space-y-6">
        <Input
          label="Full Name"
          placeholder="John Doe"
          type="text"
        />

        <Input
          label="Email"
          placeholder="john@example.com"
          type="email"
        />

        <Input
          label="Password"
          placeholder="••••••••"
          type="password"
        />

        <Input
          label="Confirm Password"
          placeholder="••••••••"
          type="password"
        />

        <Button type="submit">
          Create Account
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