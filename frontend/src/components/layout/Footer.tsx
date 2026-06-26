function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-6">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} CareerAI. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;