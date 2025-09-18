import Navbar from "./components/site/Navbar";
import Hero from "./components/site/Hero";
import Features from "./components/site/Features";
import HowItWorks from "./components/site/HowItWorks";
import RegisterSection from "./components/site/RegisterSection";
import Footer from "./components/site/Footer";

export default function Home() {
  return (
    <div className="font-sans min-h-screen grid grid-rows-[auto_1fr_auto] bg-white dark:bg-black">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <RegisterSection />
      </main>
      <Footer />
    </div>
  );
}
