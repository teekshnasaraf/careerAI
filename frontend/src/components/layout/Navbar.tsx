import { Link } from "react-router-dom";
import { BriefcaseBusiness } from "lucide-react";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-bold text-blue-600"
        >
          <BriefcaseBusiness size={28} />
          CareerAI
        </Link>

        {/* Navigation Links */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-gray-700 transition-colors hover:text-blue-600"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="text-gray-700 transition-colors hover:text-blue-600"
          >
            How It Works
          </a>

          <a
            href="#testimonials"
            className="text-gray-700 transition-colors hover:text-blue-600"
          >
            Testimonials
          </a>

          <a
            href="#faq"
            className="text-gray-700 transition-colors hover:text-blue-600"
          >
            FAQ
          </a>
        </div>

        {/* Authentication Buttons */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="font-medium text-gray-700 transition-colors hover:text-blue-600"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="rounded-lg bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;