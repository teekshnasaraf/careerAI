import { Bell } from "lucide-react";
import { useAuth } from "../../context/useAuth";

function Topbar() {
  const { user } = useAuth();

  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome Back 👋
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Ready to improve your career today?
        </p>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative rounded-full p-2 transition hover:bg-gray-100">
          <Bell size={22} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            {user?.fullName?.charAt(0).toUpperCase() || "U"}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {user?.fullName || "User"}
            </h3>

            <p className="text-sm text-gray-500">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;