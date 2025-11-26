export default function SkeletonLoader() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Image skeleton */}
            <div className="aspect-square bg-gray-200"></div>

            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>

              {/* Subtitle */}
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>

              {/* Date */}
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>

              {/* Buttons */}
              <div className="flex gap-2 mt-4">
                <div className="flex-1 h-9 bg-gray-200 rounded"></div>
                <div className="h-9 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
