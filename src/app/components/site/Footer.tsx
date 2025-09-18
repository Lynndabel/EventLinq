export default function Footer() {
  return (
    <footer className="px-6 py-6 border-t border-gray-200 dark:border-gray-800 text-xs text-center text-gray-600 dark:text-gray-300">
      © {new Date().getFullYear()} EventLinq. All rights reserved.
    </footer>
  );
}
