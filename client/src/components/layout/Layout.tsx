import { useState } from "react";
import { Outlet } from "react-router";
import Header from "./Header";
import AllMenu from "./AllMenu";
import Footer from "./Footer";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header onOpenMenu={() => setMenuOpen(true)} />
      <AllMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
