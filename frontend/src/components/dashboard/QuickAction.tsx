import type { LucideIcon } from "lucide-react";

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
}

function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="rounded-xl bg-blue-100 p-3">
        <Icon className="text-blue-600" size={26} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">
          {title}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>
    </button>
  );
}

export default QuickAction;