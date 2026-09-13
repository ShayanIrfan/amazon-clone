import { useState } from "react";
import { Outlet } from "react-router";
import Header from "./Header";
import SecondaryNav from "./SecondaryNav";
import AllMenu from "./AllMenu";
import Footer from "./Footer";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100">
      <Header onOpenMenu={() => setMenuOpen(true)} />
      <SecondaryNav onOpenMenu={() => setMenuOpen(true)} />
      <AllMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
