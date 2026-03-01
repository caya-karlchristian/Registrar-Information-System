import { useLocation, useNavigate } from "react-router-dom";

export default function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const message = location.state?.message || "You don't have permission to access this resource.";
  const status = location.state?.status || 403;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-white font-sans">
      <div className="flex flex-col items-center text-center gap-3">

        <h1 className="text-8xl font-extrabold" style={{ color: "#800000" }}>
          {status}
        </h1>

        <p className="text-gray-500 text-sm max-w-xs">{message}</p>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2.5 text-sm rounded-lg text-white font-semibold transition-all active:scale-95"
          style={{ backgroundColor: "#800000" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#600000")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#800000")}
        >
          Go Back
        </button>

      </div>
    </div>
  );
}