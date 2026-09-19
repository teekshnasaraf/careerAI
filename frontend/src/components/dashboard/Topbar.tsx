import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import ProfileNotification from "./ProfileNotification";

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
        <ProfileNotification />

        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-gray-100 cursor-pointer"
          title="Go to Profile & Settings"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white shadow-sm">
            {user?.fullName?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="text-left">
            <h3 className="font-semibold text-gray-900 leading-snug">
              {user?.fullName || "User"}
            </h3>

            <p className="text-xs text-gray-500">
              {user?.email}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}

export default Topbar;