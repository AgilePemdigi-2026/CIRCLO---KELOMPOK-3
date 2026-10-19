const GREEN = "#356b00";

export const labelClass = "mb-1 block text-[11px] font-semibold text-gray-800";
export const fieldClass =
  "flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 focus-within:border-[#356b00] focus-within:ring-1 focus-within:ring-[#356b00]";
export const inputClass =
  "w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400";

function Icon({ children }) {
  return (
    <svg
      className="h-4 w-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Icon>
);

export const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
);

export const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const RoleIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    <path d="M17 8h5M19.5 5.5v5" />
  </Icon>
);

export const EyeIcon = ({ off }) => (
  <Icon>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </Icon>
);

export function AuthField({ label, icon, action, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className={fieldClass}>
        {icon}
        {children}
        {action}
      </div>
    </div>
  );
}

export function AuthInput({ className = "", ...props }) {
  return <input {...props} className={`${inputClass} ${className}`} />;
}

export { GREEN };
