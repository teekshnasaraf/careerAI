interface StatCardProps {
  title: string;
  value: string;
  description: string;
}

function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md">
      <h3 className="text-sm font-medium text-gray-500">
        {title}
      </h3>

      <p className="mt-3 text-4xl font-bold text-blue-600">
        {value}
      </p>

      <p className="mt-2 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default StatCard;