import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import WebConsole from '@/components/WebConsole';
import Download from '@/components/Download';
import Pricing from '@/components/Pricing';
import Security from '@/components/Security';
import Cases from '@/components/Cases';
import Faq from '@/components/Faq';
import CtaBand from '@/components/CtaBand';
import Contacts from '@/components/Contacts';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <WebConsole />
        <Download />
        <Pricing />
        <Security />
        <Cases />
        <Faq />
        <CtaBand />
        <Contacts />
      </main>
      <Footer />
    </div>
  );
};

export default Index;