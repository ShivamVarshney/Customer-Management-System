import { ClipLoader } from "react-spinners";

export default function Loader({ message = "Loading...", size = 34, fullScreen = false }) {
  return (
    <div
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 text-center ${fullScreen ? "min-h-[calc(100vh-6rem)]" : "min-h-40"}`}
      role="status"
    >
      <ClipLoader aria-label={message} color="var(--crm-primary)" size={size} />
      <span className="text-sm font-medium text-crm-muted">{message}</span>
    </div>
  );
}
